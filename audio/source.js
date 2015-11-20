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
	var filter = audioContext.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 20000;
	filter.connect(panner);
	
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
	source.connect(filter);
	source.buffer = buffer;
	
	var parameters = {};
	parameters[AMPLITUDE] = dryGain.gain;
	parameters[PLAYBACK_RATE] = source.playbackRate;
	parameters[REVERB] = reverbGain.gain;
	parameters[FILTER] = filter.frequency;
	parameters[PAN] = {value:0}; //mock parameters since panner non-readable
	parameters[HEIGHT] = {value:0};
	parameters[DISTANCE] = {value:0};
	var positiveParameters = [AMPLITUDE, PLAYBACK_RATE, REVERB, FILTER];
	var positionParameters = [PAN, HEIGHT, DISTANCE];
	
	setParameter(AMPLITUDE, dmo.getParameter(AMPLITUDE).value);
	setParameter(PLAYBACK_RATE, dmo.getParameter(PLAYBACK_RATE).value);
	setParameter(REVERB, dmo.getParameter(REVERB).value);
	setParameter(PAN, dmo.getParameter(PAN).value);
	setParameter(HEIGHT, dmo.getParameter(HEIGHT).value);
	setParameter(DISTANCE, dmo.getParameter(DISTANCE).value);
	
	
	this.getDmo = function() {
		return dmo;
	}
	
	this.getDuration = function() {
		return duration;
	}
	
	this.getParameter = function(name) {
		return parameters[name].value;
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
	
	this.changeParameter = function(name, change) {
		return setParameter(name, change, true);
	}
	
	function setParameter(name, value, relative) {
		if (relative) {
			value += parameters[name].value;
		}
		if (value < 0 && positiveParameters.indexOf(name) >= 0) {
			value = 0;
		}
		parameters[name].value = value;
		if (positionParameters.indexOf(name) >= 0) {
			updatePannerPosition();
		}
		return parameters[name].value;
	}
	
	function updatePannerPosition() {
		if (parameters[DISTANCE].value == 0) {
			parameters[DISTANCE].value = -0.01; //for chrome :( source not audible at z = 0
		}
		panner.setPosition(parameters[PAN].value, parameters[HEIGHT].value, parameters[DISTANCE].value);
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