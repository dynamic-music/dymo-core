function Scheduler(audioContext, allSourcesReadyCallback, onPlaybackChange) {
	
	var self = this;
	var SCHEDULE_AHEAD_TIME = 0.1; //seconds
	
	var buffers = {};
	var sources = {};
	var nextSources = {};
	var endTimes = {};
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
		var audioLoader = new AudioSampleLoader();
		loadAudio(filePath, audioLoader, function() {
			buffers[filePath] = audioLoader.response;
			sourceReady();
		});
	}
	
	function sourceReady() {
		numCurrentlyLoading--;
		if (numCurrentlyLoading == 0 && allSourcesReadyCallback) {
			allSourcesReadyCallback();
		}
	}
	
	this.play = function(dmo) {
		internalPlay(dmo);
	}
	
	function internalPlay(dmo) {
		var uri = dmo.getUri();
		if (!sources[uri]) {
			//initially create sources
			sources[uri] = createNextSource(dmo);
		} else {
			//switch source
			sources[uri] = nextSources[uri];
		}
		if (!endTimes[uri]) {
			delay = SCHEDULE_AHEAD_TIME;
		} else {
			delay = endTimes[uri]-audioContext.currentTime;
		}
		currentDmo = sources[uri].getDmo();
		var startTime = audioContext.currentTime+delay;
		sources[uri].play(startTime);//, currentPausePosition); //% audioSource.loopEnd-audioSource.loopStart);
		setTimeout(function() {
			updatePlayingDmos(currentDmo);
		}, delay);
		endTimes[uri] = startTime+sources[uri].getDuration();
		nextSources[uri] = createNextSource(dmo);
		if (nextSources[uri] && endTimes[uri]) {
			//TODO MAKE TIMEOUT IDS FOR EACH DMO!!!!!
			timeoutID = setTimeout(function() { internalPlay(dmo); }, (endTimes[uri]-audioContext.currentTime-SCHEDULE_AHEAD_TIME)*1000);
		} else {
			timeoutID = setTimeout(function() { reset(dmo); }, (endTimes[uri]-audioContext.currentTime)*1000);
		}
	}
	
	this.pause = function(dmo) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.pause();
		}
	}
	
	this.stop = function(dmo) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.stop();
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
	
	this.updateAmplitude = function(dmo, change) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.changeAmplitude(change);
		}
	}
	
	this.updatePlaybackRate = function(dmo, change) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.changePlaybackRate(change);
		}
	}
	
	this.updatePan = function(dmo, change) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.changePosition(change, 0, 0);
		}
	}
	
	this.updateDistance = function(dmo, change) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.changePosition(0, 0, change);
		}
	}
	
	this.updateReverb = function(dmo, change) {
		var source = sources[dmo.getUri()];
		if (source) {
			source.changeReverb(change);
		}
	}
	
	this.updateListenerOrientation = function() {
		var angleInRadians = this.listenerOrientation.value * (Math.PI/180);
		$scope.audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
	}
	
	function loadAudio(path, audioLoader, onload) {
		numCurrentlyLoading++;
		audioLoader.src = path;
		audioLoader.ctx = audioContext;
		audioLoader.onload = onload;
		audioLoader.onerror = function() {
			console.log("Error loading audio");
		};
		audioLoader.send();
	}
	
	function createNextSource(dmo) {
		nextPart = dmo.getNextPart();
		if (nextPart) {
			var buffer = buffers[dmo.getSourcePath()];
			return new Source(nextPart, audioContext, buffer, convolverSend);
		}
	}
	
}