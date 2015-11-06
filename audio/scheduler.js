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
		var currentSource;
		if (!sources[uri]) {
			//create first source
			currentSource = createNextSource(dmo);
			currentDymo = currentSource.getDmo();
			sources[uri] = {};
			registerSource(uri, currentDymo.getUri(), currentSource);
			previousOnsets[uri] = currentDymo.getFeature("onset");
		} else {
			//switch to source
			currentSource = nextSources[uri];
			registerSource(uri, currentSource.getDmo().getUri(), currentSource);
		}
		if (!endTimes[uri]) {
			delay = SCHEDULE_AHEAD_TIME;
		} else {
			delay = endTimes[uri]-audioContext.currentTime;
		}
		var startTime = audioContext.currentTime+delay;
		currentSource.play(startTime);//, currentPausePosition); //% audioSource.loopEnd-audioSource.loopStart);
		setTimeout(function() {
			updatePlayingDmos(currentSource.getDmo());
		}, delay);
		var nextSource = createNextSource(dmo);
		if (nextSource) {
			nextSources[uri] = nextSource;
			//REALLY BAD QUICKFIX! REDESIGN!!!
			var nextOnset = nextSource.getDmo().getFeature("onset");
			var timeToNextOnset = nextOnset-previousOnsets[uri];
			if (nextOnset && !timeToNextOnset || timeToNextOnset < currentSource.getDuration()) {
				endTimes[uri] = startTime+timeToNextOnset;
				previousOnsets[uri] = nextOnset;
			} else {
				endTimes[uri] = startTime+currentSource.getDuration();
			}
			if (endTimes[uri]) {
				//TODO MAKE TIMEOUT IDS FOR EACH DYMO!!!!!
				timeoutID = setTimeout(function() { internalPlay(dmo); }, (endTimes[uri]-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000);
			}
		} else {
			endTimes[uri] = startTime+currentSource.getDuration();
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
		var sourcesToPause = sources[dmo.getUri()];
		if (sourcesToPause) {
			for (var source in sourcesToPause) {
				sourcesToPause[source].pause();
			}
		}
	}
	
	this.stop = function(dmo) {
		var sourcesToStop = sources[dmo.getUri()];
		if (sourcesToStop) {
			for (var source in sourcesToStop) {
				sourcesToStop[source].stop();
			}
		}
		reset(dmo);
	}
	
	function reset(dmo) {
		window.clearTimeout(timeoutID);
		var uri = dmo.getUri();
		sources[uri] = null;
		nextSources[uri] = null;
		endTimes[uri] = null;
		dmo.resetPartsPlayed();
		updatePlayingDmos(null);
	}
	
	function updatePlayingDmos(dmo) {
		var newDmos = [];
		var currentDmo = dmo;
		while (currentDmo != null) {
			newDmos.push(currentDmo.getUri());
			currentDmo = currentDmo.getParent();
		}
		self.urisOfPlayingDmos = newDmos;
		if (onPlaybackChange) {
			onPlaybackChange();
		}
	}
	
	this.updateParameter = function(dmo, name, change) {
		var sourcesToUpdate = allSources[dmo.getUri()];
		if (sourcesToUpdate) {
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
	
	function createNextSource(dmo) {
		nextPart = dmo.getNextPart();
		if (nextPart && nextPart.getSourcePath()) {
			var buffer = buffers[nextPart.getSourcePath()];
			return new Source(nextPart, audioContext, buffer, convolverSend);
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