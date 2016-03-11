/**
 * Manages playing back any number of dymos.
 * @constructor
 * @param {Function=} onPlaybackChange (optional)
 */
function Scheduler(audioContext, onSourcesChange, onPlaybackChange) {
	
	var self = this;
	
	var SCHEDULE_AHEAD_TIME = 0.1; //seconds
	
	var buffers = {};
	var sources = new Map(); //grouped by top dymo
	var nextSources = {}; //for each top dymo
	var endTimes = {};
	var previousOnsets = {};
	this.urisOfPlayingDymos = [];
	
	//horizontal listener orientation in degrees
	this.listenerOrientation = new Parameter(this, 0);
	
	var convolverSend = audioContext.createConvolver();
	convolverSend.connect(audioContext.destination);
	
	var numCurrentlyLoading = 0;
	var timeoutID;//TODO MAKE TIMEOUT IDS FOR EACH DMO!!!!!
	
	this.setReverbFile = function(filePath) {
		loadAudio(filePath, function(buffer) {
			convolverSend.buffer = buffer;
			sourceReady();
		});
	}
	
	this.setScheduleAheadTime = function(scheduleAheadTime) {
		SCHEDULE_AHEAD_TIME = scheduleAheadTime;
	}
	
	this.loadBuffers = function(dymo) {
		var allPaths = dymo.getAllSourcePaths();
		for (var i = 0, ii = allPaths.length; i < ii; i++) {
			if (!buffers[allPaths[i]]) {
				//only add if not there yet..
				loadAudio(allPaths[i]);
			}
		}
	}
	
	this.getBuffer = function(dymo) {
		return buffers[dymo.getSourcePath()];
	}
	
	function sourceReady() {
		if (numCurrentlyLoading > 0) {
			numCurrentlyLoading--;
		}
		if (numCurrentlyLoading == 0 && onSourcesChange) {
			onSourcesChange(numCurrentlyLoading);
		}
	}
	
	this.play = function(dymo) {
		dymo.updatePartOrder(ONSET);
		recursivePlay(dymo);
	}
	
	var deltaOnset = 0;
	
	function recursivePlay(dymo) {
		var uri = dymo.getUri();
		var currentSources;
		if (!nextSources[uri]) {
			//create first source
			currentSources = createNextSources(dymo);
			for (var i = 0; i < currentSources.length; i++) {
				var currentDymo = currentSources[i].getDymo();
				sources.set(currentDymo, currentSources[i]);
				previousOnsets[uri] = currentDymo.getParameter(ONSET).getValue();
				if (previousOnsets[uri] < 0) {
					deltaOnset = -1*previousOnsets[uri];
				}
			}
		} else {
			//switch to source
			currentSources = nextSources[uri];
			for (var i = 0; i < currentSources.length; i++) {
				sources.set(currentSources[i].getDymo(), currentSources[i]);
			}
		}
		var delay;
		if (!endTimes[uri]) {
			delay = SCHEDULE_AHEAD_TIME;
		} else {
			delay = endTimes[uri]-audioContext.currentTime;
		}
		var startTime = audioContext.currentTime+delay;
		for (var i = 0; i < currentSources.length; i++) {
			currentSources[i].play(startTime);//, currentPausePosition); //% audioSource.loopEnd-audioSource.loopStart);
		}
		setTimeout(function() {
			updatePlayingDymos();
		}, delay);
		var nextSrcs = createNextSources(dymo);
		if (nextSrcs) {
			nextSources[uri] = nextSrcs;
			//REALLY BAD QUICKFIX! REDESIGN!!!
			//TODO ACCOUNT FOR MAX DURATION OF PARALLEL SOURCES!!!!! instead currentSources[0].getDuration()
			var nextOnset = nextSrcs[0].getDymo().getParameter(ONSET).getValue();
			var timeToNextOnset = nextOnset-previousOnsets[uri];
			if (nextOnset != -1) { //JUST A QUICKFIX (-1 standard value), DEAL WITH ONSETS FOR REAL!! //&& !timeToNextOnset || timeToNextOnset < currentSources[0].getDuration()) {
				endTimes[uri] = startTime+timeToNextOnset;
				previousOnsets[uri] = nextOnset;
			} else {
				endTimes[uri] = startTime+(currentSources[0].getDuration()/currentSources[0].getDymo().getParameter(PLAYBACK_RATE).getValue());
			}
			if (endTimes[uri]) {
				//TODO MAKE TIMEOUT IDS FOR EACH DYMO!!!!!
				timeoutID = setTimeout(function() { recursivePlay(dymo); }, (endTimes[uri]-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000);
			}
		} else {
			endTimes[uri] = startTime+currentSources[0].getDuration()/currentSources[0].getDymo().getParameter(PLAYBACK_RATE).getValue();
			timeoutID = setTimeout(function() { reset(dymo); }, (endTimes[uri]-audioContext.currentTime)*1000);
		}
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
				sources.delete(dymos[i]);
			}
		}
		reset(dymo);
	}
	
	/** @private returns the source correponding to the given dymo */
	this.getSource = function(dymo) {
		return sources.get(dymo);
	}
	
	function reset(dymo) {
		window.clearTimeout(timeoutID);
		var uri = dymo.getUri();
		//sources[uri] = null;
		nextSources[uri] = null;
		endTimes[uri] = null;
		dymo.resetPartsPlayed();
		updatePlayingDymos();
	}
	
	function updatePlayingDymos() {
		var uris = [];
		for (var currentDymo of sources.keys()) {
			while (currentDymo != null) {
				if (uris.indexOf(currentDymo.getUri()) < 0) {
					uris.push(currentDymo.getUri());
				}
				currentDymo = currentDymo.getParent();
			}
		}
		uris.sort();
		self.urisOfPlayingDymos = uris;
		if (onPlaybackChange) {
			onPlaybackChange();
		}
	}
	
	this.updateListenerOrientation = function() {
		var angleInRadians = this.listenerOrientation.getValue() / 180 * Math.PI;
		audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
	}
	
	function createNextSources(dymo) {
		var nextParts = dymo.getNextParts();
		if (nextParts) {
			var nextSources = [];
			for (var i = 0; i < nextParts.length; i++) {
				if (nextParts[i].getSourcePath()) {
					var buffer = buffers[nextParts[i].getSourcePath()];
					nextSources.push(new Source(nextParts[i], audioContext, buffer, convolverSend));
				}
			}
			return nextSources;
		}
	}
	
	/** @param {Function=} callback (optional) */
	function loadAudio(path, callback) {
		numCurrentlyLoading++;
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				if (callback) {
					callback(buffer);
				} else {
					buffers[path] = buffer;
					sourceReady();
				}
			});
		}
		request.error = function(){};
		request.send();
	}
	
}