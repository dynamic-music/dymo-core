function Scheduler(audioContext, onSourcesChange, onPlaybackChange) {
	
	var self = this;
	var SCHEDULE_AHEAD_TIME = 0.1; //seconds
	
	var buffers = {};
	var sources = {}; //grouped by top dymo
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
		var audioLoader = new AudioSampleLoader();
		loadAudio(filePath, audioLoader, function() {
			convolverSend.buffer = audioLoader.response;
			sourceReady();
		});
	}
	
	this.addSourceFile = function(filePath) {
		//only add if not there yet..
		if (!buffers[filePath]) {
			var audioLoader = new AudioSampleLoader();
			loadAudio(filePath, audioLoader, function() {
				buffers[filePath] = audioLoader.response;
				sourceReady();
			});
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
		internalPlay(dymo);
	}
	
	function internalPlay(dymo) {
		var uri = dymo.getUri();
		var currentSources;
		if (!sources[uri]) {
			//create first source
			currentSources = createNextSources(dymo);
			sources[uri] = {};
			for (var i = 0; i < currentSources.length; i++) {
				var currentDymo = currentSources[i].getDymo();
				registerSource(uri, currentDymo.getUri(), currentSources[i]);
				previousOnsets[uri] = currentDymo.getFeature("onset");
			}
		} else {
			//switch to source
			currentSources = nextSources[uri];
			for (var i = 0; i < currentSources.length; i++) {
				registerSource(uri, currentSources[i].getDymo().getUri(), currentSources[i]);
			}
		}
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
			var playingDymos = [];
			for (var i = 0; i < currentSources.length; i++) {
				playingDymos.push(currentSources[i].getDymo());
			}
			updatePlayingDymos(playingDymos);
		}, delay);
		var nextSrcs = createNextSources(dymo);
		if (nextSrcs) {
			nextSources[uri] = nextSrcs;
			//REALLY BAD QUICKFIX! REDESIGN!!!
			//TODO ACCOUNT FOR MAX DURATION OF PARALLEL SOURCES!!!!! instead currentSources[0].getDuration()
			var nextOnset = nextSrcs[0].getDymo().getParameter(ONSET).getValue();
			var timeToNextOnset = nextOnset-previousOnsets[uri];
			if (nextOnset >= 0) { //&& !timeToNextOnset || timeToNextOnset < currentSources[0].getDuration()) {
				endTimes[uri] = startTime+timeToNextOnset;
				previousOnsets[uri] = nextOnset;
			} else {
				endTimes[uri] = startTime+(currentSources[0].getDuration()/currentSources[0].getParameterValue(PLAYBACK_RATE));
			}
			if (endTimes[uri]) {
				//TODO MAKE TIMEOUT IDS FOR EACH DYMO!!!!!
				timeoutID = setTimeout(function() { internalPlay(dymo); }, (endTimes[uri]-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000);
			}
		} else {
			endTimes[uri] = startTime+currentSources[0].getDuration()/currentSources[0].getParameterValue(PLAYBACK_RATE);
			timeoutID = setTimeout(function() { reset(dymo); }, (endTimes[uri]-audioContext.currentTime)*1000);
		}
	}
	
	function registerSource(topUri, dymoUri, source) {
		sources[topUri][dymoUri] = source;
	}
	
	this.pause = function(dymo) {
		callOnSources(dymo, "pause");
	}
	
	this.stop = function(dymo) {
		callOnSources(dymo, "stop");
		reset(dymo);
	}
	
	function callOnSources(dymo, func) {
		var dymoSources = sources[dymo.getUri()];
		if (dymoSources) {
			for (var key in dymoSources) {
				dymoSources[key][func].call(dymoSources[key]);
			}
		}
	}
	
	function reset(dymo) {
		window.clearTimeout(timeoutID);
		var uri = dymo.getUri();
		sources[uri] = null;
		nextSources[uri] = null;
		endTimes[uri] = null;
		dymo.resetPartsPlayed();
		updatePlayingDymos([]);
	}
	
	function updatePlayingDymos(dymos) {
		var newDymos = [];
		for (var i = 0; i < dymos.length; i++) {
			var currentDymo = dymos[i];
			while (currentDymo != null) {
				if (newDymos.indexOf(currentDymo.getUri()) < 0) {
					newDymos.push(currentDymo.getUri());
				}
				currentDymo = currentDymo.getParent();
			}
		}
		self.urisOfPlayingDymos = newDymos;
		if (onPlaybackChange) {
			onPlaybackChange();
		}
	}
	
	this.getSources = function(dymo) {
		return sources[dymo.getUri()];
	}
	
	this.updateListenerOrientation = function() {
		var angleInRadians = this.listenerOrientation.value / 180 * Math.PI;
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
	
	function loadAudio(path, audioLoader, onload) {
		numCurrentlyLoading++;
		audioLoader.src = path;
		audioLoader.ctx = audioContext;
		audioLoader.onload = onload;
		audioLoader.onerror = function() {
			console.log("Error loading audio ", path);
		};
		audioLoader.send();
	}
	
	this.listenerOrientation = new Parameter(this, this.updateListenerOrientation, 0);
	
}