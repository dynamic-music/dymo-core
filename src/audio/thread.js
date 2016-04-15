/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
function SchedulerThread(dymo, navigator, audioContext, buffers, convolverSend, onChanged, onEnded) {
	
	var self = this;
	
	var sources = new Map(); //dymo->source
	var timeoutID;
	var currentSources = [];
	var currentEndTime;
	var nextSources;
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
	
	this.pause = function(dymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		for (var i = 0, ii = dymos.length; i < ii; i++) {
			var currentSource = sources.get(dymos[i]);
			if (currentSource) {
				currentSource.pause();
			}
		}
	}
	
	this.stop = function(dymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		for (var i = 0, ii = dymos.length; i < ii; i++) {
			var currentSource = sources.get(dymos[i]);
			if (currentSource) {
				currentSource.stop();
				//TODO REMOVE NEXT SOURCES
			}
		}
	}
	
	this.getSources = function() {
		return sources;
	}
	
	/** @private returns the source correponding to the given dymo */
	this.getSource = function(dymo) {
		return sources.get(dymo);
	}
	
	function recursivePlay() {
		//create sources and init
		currentSources = getNextSources();
		registerSources(currentSources);
		//console.log(currentSources)
		if (!previousOnset) {
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			previousOnset = currentSources[0].getDymo().getParameter(ONSET).getValue();
		}
		//calculate delay and schedule
		var delay = getCurrentDelay();
		var startTime = audioContext.currentTime+delay;
		for (var i = 0; i < currentSources.length; i++) {
			currentSources[i].play(startTime);
		}
		setTimeout(function() { onChanged(); }, delay);
		//create next sources and wait or end and reset
		nextSources = createNextSources();
		if (nextSources) {
			currentEndTime = getCurrentEndTime(startTime);
			var wakeupTime = (currentEndTime-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000;
			timeoutID = setTimeout(function() { recursivePlay(); }, wakeupTime);
		} else {
			currentEndTime = getCurrentEndTime(startTime);
			var wakeupTime = (currentEndTime-audioContext.currentTime)*1000;
			setTimeout(function() {
				navigator.reset();
				if (onEnded) {
					onEnded();
				}
			}, wakeupTime);
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
		for (var i = 0; i < newSources.length; i++) {
			sources.set(newSources[i].getDymo(), newSources[i]);
		}
	}
	
	function sourceEnded(source) {
		sources.delete(source.getDymo());
		if (sources.size == 0) {
			window.clearTimeout(timeoutID);
		}
		onChanged();
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
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var nextOnset = nextSources[0].getDymo().getParameter(ONSET).getValue();
			var timeToNextOnset = nextOnset-previousOnset;
			previousOnset = nextOnset;
			if (!isNaN(nextOnset)) {
				return startTime+timeToNextOnset;
			}
		}
		return startTime+getSourceDuration(currentSources[0]);
	}
	
	function getSourceDuration(source) {
		var playbackRate = source.getDymo().getParameter(PLAYBACK_RATE).getValue();
		return source.getDuration()/playbackRate;
	}
	
	function createNextSources() {
		var nextParts = navigator.getNextParts();
		console.log(nextParts.map(function(s){return s.getIndex();}))
		if (nextParts) {
			var nextSources = [];
			for (var i = 0; i < nextParts.length; i++) {
				if (nextParts[i].getSourcePath()) {
					var buffer = buffers[nextParts[i].getSourcePath()];
					nextSources.push(new Source(nextParts[i], audioContext, buffer, convolverSend, sourceEnded));
				}
			}
			return nextSources;
		}
	}
	
}