function Source(dymo, audioContext, buffer, reverbSend) {
	
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
	
	var segment = dymo.getSegment();
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
	
	var source;
	if (dymo.getParameter(TIME_STRETCH_RATIO).getValue() != 1) {
		source = new AudioProcessorSource(audioContext, buffer, filter);
	} else {
		source = audioContext.createBufferSource();
		source.connect(filter);
		source.buffer = buffer;
	}
	
	var parameters = {};
	parameters[AMPLITUDE] = dryGain.gain;
	parameters[PLAYBACK_RATE] = source.playbackRate;
	parameters[TIME_STRETCH_RATIO] = source.stretchRatio;
	parameters[REVERB] = reverbGain.gain;
	parameters[FILTER] = filter.frequency;
	parameters[PAN] = {value:0}; //mock parameters since panner non-readable
	parameters[HEIGHT] = {value:0};
	parameters[DISTANCE] = {value:0};
	var allParameters = [AMPLITUDE, PLAYBACK_RATE, REVERB, FILTER, PAN, HEIGHT, DISTANCE];
	var positiveParameters = [AMPLITUDE, PLAYBACK_RATE, REVERB, FILTER];
	var positionParameters = [PAN, HEIGHT, DISTANCE];
	
	initParameter(AMPLITUDE, dymo.getParameter(AMPLITUDE));
	initParameter(PLAYBACK_RATE, dymo.getParameter(PLAYBACK_RATE));
	initParameter(TIME_STRETCH_RATIO, dymo.getParameter(TIME_STRETCH_RATIO));
	initParameter(REVERB, dymo.getParameter(REVERB));
	initParameter(PAN, dymo.getParameter(PAN));
	initParameter(HEIGHT, dymo.getParameter(HEIGHT));
	initParameter(DISTANCE, dymo.getParameter(DISTANCE));
	
	function initParameter(name, dymoParam) {
		setParameter(name, dymoParam.getValue());
		dymoParam.addObserver(self);
	}
	
	function removeFromObserved() {
		for (var i = 0; i < allParameters.length; i++) {
			var dymoParam = dymo.getParameter(allParameters[i]);
			if (dymoParam) {
				dymoParam.removeObserver(self);
			}
		}
	}
	
	this.observedParameterChanged = function(param) {
		setParameter(param.getName(), param.getChange(), true);
	}
	
	function setParameter(name, value, relative) {
		if (relative) {
			value += self.getParameterValue(name);
		}
		if (value < 0 && positiveParameters.indexOf(name) >= 0) {
			value = 0;
		}
		setParameterValue(name, value);
		if (positionParameters.indexOf(name) >= 0) {
			updatePannerPosition();
		}
	}
	
	this.getDymo = function() {
		return dymo;
	}
	
	this.getDuration = function() {
		return duration;
	}
	
	this.getParameterValue = function(name) {
		if (parameters[name]) {
			if (parameters[name].value || parameters[name].value == 0) {
				return parameters[name].value;
			} else {
				return parameters[name].getValue();
			}
		}
	}
	
	function setParameterValue(name, value) {
		if (parameters[name]) {
			if (parameters[name].value || parameters[name].value == 0) {
				parameters[name].value = value;
			} else {
				parameters[name].setValue(value);
			}
		}
	}
	
	this.play = function(startTime) {
		source.onended = removeFromObserved;
		source.start(startTime);
		//source.start(startTime, currentPausePosition);
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
			removeFromObserved();
		}
		//even in case it is paused
		currentPausePosition = 0;
	}
	
	function stopAndRemoveAudioSources() {
		isPlaying = false;
		source.stop(0);
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