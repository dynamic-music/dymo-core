function Source(dmo, audioContext, buffer, reverbSend) {
	
	var self = this;
	
	var FADE_LENGTH = 0.02; //seconds
	
	var startTime, endTime, currentPausePosition = 0;
	var isPlaying, isPaused;
	
	var dryGain = audioContext.createGain();
	dryGain.connect(audioContext.destination);
	var reverbGain = audioContext.createGain();
	reverbGain.connect(reverbSend);
	reverbGain.gain.value = 0;
	var panner = audioContext.createPanner();
	panner.connect(dryGain);
	panner.connect(reverbGain);
	
	var segment = dmo.getSegment();
	var time = segment[0];
	var duration = segment[1];
	if (!time) {
		time = 0;
	}
	if (!duration) {
		duration = buffer.duration-time;
	}
	if (time != 0 || duration != buffer.duration) {
		//add time for fade after source officially done
		buffer = getSubBuffer(buffer, toSamples(time, buffer), toSamples(duration+FADE_LENGTH, buffer));
	} else {
		fadeBuffer(buffer, toSamples(duration, buffer));
	}
	
	var source = audioContext.createBufferSource();
	source.connect(panner);
	source.buffer = buffer;
	
	var currentAmplitude = dmo.amplitude.value;
	updateAmplitude();
	var currentPlaybackRate = dmo.playbackRate.value;
	updatePlaybackRate();
	var currentPannerPosition = [dmo.pan.value, dmo.height.value, dmo.distance.value];
	updatePosition();
	var currentReverb = dmo.reverb.value;
	updateReverb();
	
	
	this.getDmo = function() {
		return dmo;
	}
	
	this.getDuration = function() {
		return duration;
	}
	
	this.play = function(startTime) {
		source.start(startTime, currentPausePosition);
		isPlaying = true;
	}
	
	this.pause = function() {
		if (isPlaying) {
			stopAndRemoveAudioSources();
			currentPausePosition += audioContext.currentTime - startTime;
			isPaused = true;
		} else if (isPaused) {
			isPaused = false;
			this.play();
		}
	}
	
	this.stop = function() {
		if (isPlaying) {
			stopAndRemoveAudioSources();
		}
		//even in case it is paused
		currentPausePosition = 0;
	}
	
	function stopAndRemoveAudioSources() {
		isPlaying = false;
		source.stop(0);
	}
	
	function updateAmplitude() {
		if (currentAmplitude > 0) {
			dryGain.gain.value = currentAmplitude;
		} else {
			dryGain.gain.value = 0;
		}
	}
	
	function updatePosition() {
		if (currentPannerPosition[2] == 0) {
			z = -0.01; //for chrome :( source not audible at z = 0
		} else {
			z = currentPannerPosition[2];
		}
		panner.setPosition(currentPannerPosition[0], currentPannerPosition[1], z);
	}
	
	function updatePlaybackRate() {
		source.playbackRate.value = currentPlaybackRate;
	}
	
	function updateReverb() {
		if (currentReverb > 0) {
			reverbGain.gain.value = currentReverb;
		} else {
			reverbGain.gain.value = 0;
		}
	}
	
	this.changeAmplitude = function(deltaAmplitude) {
		currentAmplitude += deltaAmplitude;
		updateAmplitude();
		return currentAmplitude;
	}
	
	this.changePosition = function(deltaX, deltaY, deltaZ) {
		currentPannerPosition[0] += deltaX;
		currentPannerPosition[1] += deltaY;
		currentPannerPosition[2] += deltaZ;
		updatePosition();
		return currentPannerPosition;
	}
	
	this.changePlaybackRate = function(deltaRate) {
		currentPlaybackRate += deltaRate;
		updatePlaybackRate();
		return currentPlaybackRate;
	}
	
	this.changeReverb = function(deltaReverb) {
		currentReverb += deltaReverb;
		updateReverb();
		return currentReverb;
	}
	
	function toSamples(seconds, buffer) {
		if (seconds || seconds == 0) {
			return Math.round(seconds*buffer.sampleRate);
		}
	}
	
	function getSubBuffer(buffer, fromSample, durationInSamples) {
		var subBuffer = audioContext.createBuffer(buffer.numberOfChannels, durationInSamples, buffer.sampleRate);
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			var currentCopyChannel = subBuffer.getChannelData(i);
			var currentOriginalChannel = buffer.getChannelData(i);
			for (var j = 0; j < durationInSamples; j++) {
				currentCopyChannel[j] = currentOriginalChannel[fromSample+j];
			}
		}
		fadeBuffer(subBuffer, durationInSamples);
		return subBuffer;
	}
	
	function fadeBuffer(buffer, durationInSamples) {
		var fadeSamples = buffer.sampleRate*FADE_LENGTH;
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			var currentChannel = buffer.getChannelData(i);
			for (var j = 0.0; j < fadeSamples; j++) {
				currentChannel[j] *= j/fadeSamples;
				currentChannel[durationInSamples-j-1] *= j/fadeSamples;
			}
		}
	}
	
}