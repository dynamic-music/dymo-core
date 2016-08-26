/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
function SchedulerThread(dymo, navigator, audioContext, buffers, convolverSend, delaySend, onChanged, onEnded) {
	
	var self = this;
	
	var sources = new Map(); //dymo->list<source>
	var nodes = new Map(); //dymo->list<nodes>
	var nextSources;
	var timeoutID;
	var currentSources = [];
	var currentEndTime;
	var previousOnset;
	
	if (!navigator) {
		navigator = new DymoNavigator(dymo, new SequentialNavigator(dymo));
	}
	
	//starts automatically
	recursivePlay();
	
	this.hasDymo = function(adymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		if (dymos.indexOf(adymo)) {
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
	
	this.stop = function(dymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		for (var i = 0, ii = dymos.length; i < ii; i++) {
			var currentSources = sources.get(dymos[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].stop();
				}
			}
			if (nextSources) {
				nextSources.delete(dymos[i]);
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
		//create sources and init
		currentSources = getNextSources();
		registerSources(currentSources);
		if (!previousOnset) {
			var previousSource = currentSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			if (previousSource.hasParameter(ONSET)) {
				previousOnset = previousSource.getParameter(ONSET).getValue();
			}
		}
		//calculate delay and schedule
		var delay = getCurrentDelay();
		var startTime = audioContext.currentTime+delay;
		for (var source of currentSources.values()) {
			source.play(startTime);
		}
		setTimeout(function() { onChanged(); }, delay);
		//create next sources and wait or end and reset
		nextSources = createNextSources();
		if (nextSources && nextSources.size > 0) {
			currentEndTime = getCurrentEndTime(startTime);
			var longestSource = currentEndTime[1];
			currentEndTime = currentEndTime[0];
			//smooth transition in case of a loop
			if (longestSource.getDymo().hasParameter(LOOP) && longestSource.getDymo().getParameter(LOOP).getValue()) {
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
		var sourceList = sources.get(source.getDymo());
		sourceList.splice(sourceList.indexOf(source), 1);
		if (sourceList.length <= 0) {
			sources.delete(source.getDymo());
		}
		onChanged();
		endThreadIfNoMoreSources();
	}
	
	function endThreadIfNoMoreSources() {
		if (sources.size == 0 && (!nextSources || nextSources.size == 0)) {
			window.clearTimeout(timeoutID);
			navigator.reset();
			//remove all nodes (TODO works well but COULD BE DONE SOMEWHERE ELSE FOR EVERY NODE THAT HAS NO LONGER ANYTHING ATTACHED TO INPUT..)
			var dymos = dymo.getAllDymosInHierarchy();
			for (var i = 0, ii = dymos.length; i < ii; i++) {
				var currentNode = nodes.get(dymos[i]);
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
			var nextSource = nextSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var nextOnset;
			if (nextSource.hasParameter(ONSET)) {
				nextOnset = nextSource.getParameter(ONSET).getValue();
			}
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
			console.log(nextParts.map(function(s){if (!isNaN(s.getIndex())) {return s.getIndex();} return "top"}))
			var nextSources = new Map();
			for (var i = 0; i < nextParts.length; i++) {
				if (nextParts[i].getSourcePath()) {
					var buffer = buffers[nextParts[i].getSourcePath()];
					var newSource = new DymoSource(nextParts[i], audioContext, buffer, convolverSend, delaySend, sourceEnded);
					createAndConnectToNodes(newSource);
					nextSources.set(nextParts[i], newSource);
				}
			}
			return nextSources;
		}
	}
	
	function createAndConnectToNodes(source) {
		var currentNode = source;
		var currentParentDymo = source.getDymo().getParent();
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
			currentParentDymo = currentParentDymo.getParent();
			currentNode = parentNode;
		}
		//no more parent, top dymo reached, connect to main output
		currentNode.connect(audioContext.destination);
	}
	
}