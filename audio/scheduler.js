function Scheduler(audioContext, onSourcesChange, onPlaybackChange) {
	
	var self = this;
	var SCHEDULE_AHEAD_TIME = 0.1; //seconds
	
	var buffers = {};
	var sources = {}; //grouped by top dymo
	var nextSources = {}; //for each top dymo
	var allSources = {}; //grouped by dymo
	var endTimes = {};
	var previousOnsets = {};
	this.urisOfPlayingDmos = [];
	
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
	
	function sourceReady() {
		if (numCurrentlyLoading > 0) {
			numCurrentlyLoading--;
		}
		if (numCurrentlyLoading == 0 && onSourcesChange) {
			onSourcesChange(numCurrentlyLoading);
		}
	}
	
	this.play = function(dmo) {
		internalPlay(dmo);
	}
	
	function internalPlay(dmo) {
		var uri = dmo.getUri();
		var currentSources;
		if (!sources[uri]) {
			//create first source
			currentSources = createNextSources(dmo);
			sources[uri] = {};
			for (var i = 0; i < currentSources.length; i++) {
				var currentDymo = currentSources[i].getDmo();
				registerSource(uri, currentDymo.getUri(), currentSources[i]);
				previousOnsets[uri] = currentDymo.getFeature("onset");
			}
		} else {
			//switch to source
			currentSources = nextSources[uri];
			for (var i = 0; i < currentSources.length; i++) {
				registerSource(uri, currentSources[i].getDmo().getUri(), currentSources[i]);
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
				playingDymos.push(currentSources[i].getDmo());
			}
			updatePlayingDmos(playingDymos);
		}, delay);
		var nextSrcs = createNextSources(dmo);
		if (nextSrcs) {
			nextSources[uri] = nextSrcs;
			//REALLY BAD QUICKFIX! REDESIGN!!!
			//TODO ACCOUNT FOR MAX DURATION OF PARALLEL SOURCES!!!!! instead currentSources[0].getDuration()
			var nextOnset = nextSrcs[0].getDmo().getFeature("onset");
			var timeToNextOnset = nextOnset-previousOnsets[uri];
			if (nextOnset && !timeToNextOnset || timeToNextOnset < currentSources[0].getDuration()) {
				endTimes[uri] = startTime+timeToNextOnset;
				previousOnsets[uri] = nextOnset;
			} else {
				endTimes[uri] = startTime+currentSources[0].getDuration()/currentSources[0].getParameter(PLAYBACK_RATE);
			}
			if (endTimes[uri]) {
				//TODO MAKE TIMEOUT IDS FOR EACH DYMO!!!!!
				timeoutID = setTimeout(function() { internalPlay(dmo); }, (endTimes[uri]-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000);
			}
		} else {
			endTimes[uri] = startTime+currentSources[0].getDuration()/currentSources[0].getParameter(PLAYBACK_RATE);
			timeoutID = setTimeout(function() { reset(dmo); }, (endTimes[uri]-audioContext.currentTime)*1000);
		}
	}
	
	function registerSource(topUri, dymoUri, source) {
		sources[topUri][dymoUri] = source;
		if (!allSources[dymoUri]) {
			allSources[dymoUri] = [];
		}
		allSources[dymoUri].push(source);
	}
	
	this.pause = function(dmo) {
		callOnSources(dmo, "pause");
	}
	
	this.stop = function(dmo) {
		callOnSources(dmo, "stop");
		reset(dmo);
	}
	
	function callOnSources(dymo, func) {
		var dymoSources = sources[dymo.getUri()];
		if (dymoSources) {
			for (var key in dymoSources) {
				dymoSources[key][func].call(dymoSources[key]);
			}
		}
	}
	
	function reset(dmo) {
		window.clearTimeout(timeoutID);
		var uri = dmo.getUri();
		sources[uri] = null;
		nextSources[uri] = null;
		endTimes[uri] = null;
		dmo.resetPartsPlayed();
		updatePlayingDmos([]);
	}
	
	function updatePlayingDmos(dymos) {
		var newDmos = [];
		for (var i = 0; i < dymos.length; i++) {
			var currentDmo = dymos[i];
			while (currentDmo != null) {
				if (newDmos.indexOf(currentDmo.getUri()) < 0) {
					newDmos.push(currentDmo.getUri());
				}
				currentDmo = currentDmo.getParent();
			}
		}
		self.urisOfPlayingDmos = newDmos;
		if (onPlaybackChange) {
			onPlaybackChange();
		}
	}
	
	this.updateParameter = function(dmo, name, change) {
		var sourcesToUpdate = allSources[dmo.getUri()];
		if (sourcesToUpdate) {
			if (nextSources[dmo.getUri()]) {
				sourcesToUpdate = sourcesToUpdate.concat(nextSources[dmo.getUri()]);
			}
			var lastValue;
			for (var i = 0; i < sourcesToUpdate.length; i++) {
				lastValue = sourcesToUpdate[i].changeParameter(name, change);
			}
			return lastValue;
		}
	}
	
	this.updateListenerOrientation = function() {
		var angleInRadians = this.listenerOrientation.value / 180 * Math.PI;
		audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
	}
	
	function createNextSources(dmo) {
		var nextParts = dmo.getNextParts();
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