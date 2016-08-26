/**
 * Plays back a buffer and offers lots of changeable parameters.
 * @constructor
 * @extends {DymoNode}
 */
function DymoSource(dymo, audioContext, buffer, reverbSend, delaySend, onEnded) {
	
	DymoNode.call(this, dymo, audioContext, reverbSend, delaySend);
	
	var self = this;
	
	var SHITTY_TIMESTRETCH_BUFFER_ZONE = 0.3; //seconds
	
	var startTime, endTime, currentPausePosition = 0;
	var isPlaying, isPaused;
	var duration;
	
	var source = audioContext.createBufferSource();
	//var source = new AudioProcessorSource(audioContext, buffer, filter);
	
	source.connect(this.getInput());
	
	init();
	
	function init() {
		var segment = getSegment();
		duration = segment[1];
		var stretchRatio = getStretchRatio();
		source.buffer = getProcessedBuffer(segment, stretchRatio);
	}
	
	function getSegment() {
		var segment = dymo.getSegment();
		if (!segment[0]) {
			segment[0] = 0;
		}
		if (!segment[1] && buffer) {
			segment[1] = buffer.duration-segment[0];
		}
		if (dymo.hasParameter(DURATION_RATIO)) {
			var durationRatio = dymo.getParameter(DURATION_RATIO).getValue();
			if (0 < durationRatio && durationRatio < 1) {
				segment[1] *= durationRatio;
			}
		}
		return segment;
	}
	
	function getStretchRatio() {
		if (dymo.hasParameter(TIME_STRETCH_RATIO)) {
			return dymo.getParameter(TIME_STRETCH_RATIO).getValue();
		}
		return 1; //TODO THIS SHOULD BE STANDARD VALUE FROM GRAPH STORE
	}
	
	function getProcessedBuffer(segment, stretchRatio) {
		var time = segment[0];
		var duration = segment[1];
		if (stretchRatio != 1) {
			//get too much cause of shitty timestretch algorithm
			duration += SHITTY_TIMESTRETCH_BUFFER_ZONE;
		} else {
			//add time for fade after source officially done
			duration += FADE_LENGTH;
		}
		if (!buffer && !isNaN(time+duration)) {
			//buffer doesn't exist, try to get from server
			requestBufferFromAudioServer(dymo.getSourcePath(), time, time+duration, function(loadedBuffer) {
				return getStretchedAndFadedBuffer(loadedBuffer, duration, stretchRatio);
			});
		} else {
			//trim if buffer too long
			if (time != 0 || duration < buffer.duration) {
				buffer = getSubBuffer(buffer, toSamples(time, buffer), toSamples(duration, buffer));
			}
			return getStretchedAndFadedBuffer(buffer, duration, stretchRatio);
		}
	}
	
	function getStretchedAndFadedBuffer(buffer, duration, stretchRatio) {
		if (stretchRatio != 1) {
			buffer = new AudioProcessor(audioContext).timeStretch(buffer, stretchRatio);
			//trim it down again
			var shouldBeDuration = duration/stretchRatio;
			//add time for fade after source officially done
			buffer = getSubBuffer(buffer, 0, toSamples(shouldBeDuration+FADE_LENGTH, buffer));
			duration = shouldBeDuration;
		}
		fadeBuffer(buffer, buffer.length);
		return buffer;
	}
	
	this.addParameter(PLAYBACK_RATE, source.playbackRate);
	this.addParameter(TIME_STRETCH_RATIO, {value:0});
	this.addParameter(LOOP, {value:0});
	
	this.getDuration = function() {
		return duration;
	}
	
	this.isLoopingAndPlaying = function() {
		return source.loop && isPlaying;
	}
	
	/** @param {number=} startTime (optional) */
	this.play = function(startTime) {
		source.onended = function() {
			//disconnect all nodes
			source.disconnect();
			self.removeAndDisconnect();
			if (onEnded) {
				onEnded(self);
			}
		};
		if (!startTime) {
			startTime = 0;
		}
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
		}
		//even in case it is paused
		currentPausePosition = 0;
	}
	
	function stopAndRemoveAudioSources() {
		isPlaying = false;
		var now = audioContext.currentTime;
		self.parameters[AMPLITUDE].setValueAtTime(self.parameters[AMPLITUDE].value, now);
		self.parameters[AMPLITUDE].linearRampToValueAtTime(0, now+FADE_LENGTH);
		source.stop(now+2*FADE_LENGTH);
	}
	
	function toSamples(seconds, buffer) {
		if (seconds || seconds == 0) {
			return Math.round(seconds*buffer.sampleRate);
		}
	}
	
	function getSubBuffer(buffer, fromSample, durationInSamples) {
		//console.log(buffer, buffer.numberOfChannels, buffer.length, fromSample, durationInSamples, buffer.sampleRate)
		var samplesToCopy = Math.min(buffer.length-fromSample, durationInSamples);
		var subBuffer = audioContext.createBuffer(buffer.numberOfChannels, samplesToCopy, buffer.sampleRate);
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			var currentCopyChannel = subBuffer.getChannelData(i);
			var currentOriginalChannel = buffer.getChannelData(i);
			for (var j = 0; j < samplesToCopy; j++) {
				currentCopyChannel[j] = currentOriginalChannel[fromSample+j];
			}
		}
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
	
	function requestBufferFromAudioServer(filename, from, to, callback) {
		var index = filename.lastIndexOf('/');
		if (index) {
			filename = filename.substring(index+1);
		}
		var query = "http://localhost:8060/getAudioChunk?filename=" + filename + "&fromSecond=" + from + "&toSecond=" + to;
		loadAudio(query, function(buffer) {
			callback(buffer);
		});
	}
	
	//PUT IN AUDIO TOOLS OR SO!!! (duplicate in scheduler)
	function loadAudio(path, callback) {
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				callback(buffer);
			}, function(err) {
				console.log('audio from server is faulty');
			});
		}
		request.send();
	}
	
}
inheritPrototype(DymoSource, DymoNode);