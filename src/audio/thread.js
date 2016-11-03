/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
function SchedulerThread(dymoUri, navigator, audioContext, buffers, convolverSend, delaySend, onChanged, onEnded) {

	var self = this;

	var sources = new Map(); //dymo->list<source>
	var nodes = new Map(); //dymo->list<nodes>
	var nextSources;
	var timeoutID;
	var currentSources = new Map();
	var currentEndTime;
	var previousOnset;

	if (!navigator) {
		navigator = new DymoNavigator(dymoUri, new SequentialNavigator(dymoUri));
	}

	//starts automatically
	recursivePlay();

	this.hasDymo = function(uri) {
		var dymos = DYMO_STORE.findAllObjectsInHierarchy(dymoUri);
		if (dymos.indexOf(uri)) {
			return true;
		}
	}

	this.getNavigator = function() {
		return navigator;
	}

	/*this.pause = function(dymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		for (var i = 0, ii = dymos.length; i < ii; i++) {
			var currentSources = sources.get(dymos[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].pause();
				}
			}
		}
	}*/

	this.stop = function(dymoUri) {
		var subDymoUris = DYMO_STORE.findAllObjectsInHierarchy(dymoUri);
		for (var i = 0, ii = subDymoUris.length; i < ii; i++) {
			var currentSources = sources.get(subDymoUris[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].stop();
				}
			}
			if (nextSources) {
				nextSources.delete(subDymoUris[i]);
				if (nextSources.size <= 0) {
					nextSources = undefined;
				}
			}
		}
	}

	this.getAllSources = function() {
		return sources;
	}

	/** @private returns the sources correponding to the given dymo */
	this.getSources = function(dymo) {
		return sources.get(dymo);
	}

	function recursivePlay() {
		var previousSources = currentSources;
		//create sources and init
		currentSources = getNextSources();
		registerSources(currentSources);
		if (!previousOnset) {
			var previousSourceDymoUri = currentSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			previousOnset = DYMO_STORE.findParameterValue(previousSourceDymoUri, ONSET);
		}
		//calculate delay and schedule
		var delay = getCurrentDelay();
		var startTime = audioContext.currentTime+delay;
		for (var source of currentSources.values()) {
			source.play(startTime);
		}
		//stop automatically looping sources
		for (var source of previousSources.values()) {
			if (DYMO_STORE.findParameterValue(source.getDymoUri(), LOOP)) {
				source.stop();
			}
		}
		setTimeout(function() { onChanged(); }, delay);
		//create next sources and wait or end and reset
		nextSources = createNextSources();
		if (nextSources && nextSources.size > 0) {
			currentEndTime = getCurrentEndTime(startTime);
			var longestSource = currentEndTime[1];
			currentEndTime = currentEndTime[0];
			//smooth transition in case of a loop
			if (DYMO_STORE.findParameterValue(longestSource.getDymoUri(), LOOP)) {
				currentEndTime -= FADE_LENGTH;
			}
			var wakeupTime = (currentEndTime-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000;
			timeoutID = setTimeout(function() { recursivePlay(); }, wakeupTime);
		} else {
			currentEndTime = getCurrentEndTime(startTime);
			var wakeupTime = (currentEndTime-audioContext.currentTime)*1000;
			setTimeout(function() {
				endThreadIfNoMoreSources();
			}, wakeupTime+100);
		}
	}

	function getNextSources() {
		if (!nextSources) {
			//create first sources
			return createNextSources();
		} else {
			//switch to next sources
			return nextSources;
		}
	}

	function registerSources(newSources) {
		for (var dymoKey of newSources.keys()) {
			if (!sources.get(dymoKey)) {
				sources.set(dymoKey, []);
			}
			sources.get(dymoKey).push(newSources.get(dymoKey));
		}
	}

	function sourceEnded(source) {
		var sourceList = sources.get(source.getDymoUri());
		sourceList.splice(sourceList.indexOf(source), 1);
		if (sourceList.length <= 0) {
			sources.delete(source.getDymoUri());
		}
		onChanged();
		endThreadIfNoMoreSources();
	}

	function endThreadIfNoMoreSources() {
		if (sources.size == 0 && (!nextSources || nextSources.size == 0)) {
			window.clearTimeout(timeoutID);
			navigator.reset();
			//remove all nodes (TODO works well but COULD BE DONE SOMEWHERE ELSE FOR EVERY NODE THAT HAS NO LONGER ANYTHING ATTACHED TO INPUT..)
			var subDymoUris = DYMO_STORE.findAllObjectsInHierarchy(dymoUri);
			for (var i = 0, ii = subDymoUris.length; i < ii; i++) {
				var currentNode = nodes.get(subDymoUris[i]);
				if (currentNode) {
					currentNode.removeAndDisconnect();
				}
			}
			if (onEnded) {
				onEnded();
			}
		}
	}

	function getCurrentDelay() {
		if (!currentEndTime) {
			return SCHEDULE_AHEAD_TIME;
		} else {
			return currentEndTime-audioContext.currentTime;
		}
	}

	function getCurrentEndTime(startTime) {
		if (nextSources) {
			var nextSourceDymoUri = nextSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var nextOnset = DYMO_STORE.findParameterValue(nextSourceDymoUri, ONSET);
			var timeToNextOnset = nextOnset-previousOnset;
			previousOnset = nextOnset;
			if (!isNaN(nextOnset)) {
				return startTime+timeToNextOnset;
			}
		}
		var maxDuration = 0;
		var longestSource;
		for (var source of currentSources.values()) {
			var currentDuration = getSourceDuration(source);
			if (currentDuration > maxDuration) {
				maxDuration = currentDuration;
				longestSource = source;
			}
		}
		return [startTime+maxDuration, longestSource];
	}

	function getSourceDuration(source) {
		//var playbackRate = source.getDymo().getParameter(PLAYBACK_RATE).getValue();
		return source.getDuration();// /playbackRate;
	}

	function createNextSources() {
		var nextParts = navigator.getNextParts();
		if (nextParts) {
			logNextIndices(nextParts);
			var nextSources = new Map();
			for (var i = 0; i < nextParts.length; i++) {
				var sourcePath = DYMO_STORE.getSourcePath(nextParts[i]);
				if (sourcePath) {
					var buffer = buffers[sourcePath];
					var newSource = new DymoSource(nextParts[i], audioContext, buffer, convolverSend, delaySend, sourceEnded);
					createAndConnectToNodes(newSource);
					nextSources.set(nextParts[i], newSource);
				}
			}
			return nextSources;
		}
	}

	function logNextIndices(nextParts) {
		console.log(nextParts.map(function(s){
			var index = DYMO_STORE.findPartIndex(s);
			if (!isNaN(index)) {
				return index;
			} else {
				return "top";
			}
		}));
	}

	function createAndConnectToNodes(source) {
		var currentNode = source;
		var currentParentDymo = DYMO_STORE.findParents(source.getDymoUri())[0];
		while (currentParentDymo) {
			//parent node already defined, so just connect and exit
			if (nodes.has(currentParentDymo)) {
				currentNode.connect(nodes.get(currentParentDymo).getInput());
				return;
			}
			//parent node doesn't exist, so create entire missing parent hierarchy
			var parentNode = new DymoNode(currentParentDymo, audioContext, convolverSend, delaySend);
			currentNode.connect(parentNode.getInput());
			nodes.set(currentParentDymo, parentNode);
			currentParentDymo = DYMO_STORE.findParents(currentParentDymo)[0];
			currentNode = parentNode;
		}
		//no more parent, top dymo reached, connect to main output
		currentNode.connect(audioContext.destination);
	}

}
