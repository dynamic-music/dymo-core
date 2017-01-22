import { AMPLITUDE, PLAYBACK_RATE, TIME_STRETCH_RATIO, DURATION_RATIO, LOOP, TIME_FEATURE, DURATION_FEATURE } from '../globals/uris'
import { GlobalVars } from '../globals/globals'
import { DymoNode } from './node'
import { AudioProcessor } from './processor'

/**
 * Plays back a buffer and offers lots of changeable parameters.
 */
export class DymoSource extends DymoNode {

	private readonly SHITTY_TIMESTRETCH_BUFFER_ZONE = 0.3; //seconds
	private audioContext;
	private buffer;
	private onEnded;
	private startTime;
	private endTime;
	private currentPausePosition = 0;
	private isPlaying;
	private isPaused;
	private duration;
	private source;

	constructor(dymoUri, audioContext, buffer, reverbSend, delaySend, onEnded) {
		super(dymoUri, audioContext, reverbSend, delaySend);
		this.audioContext = audioContext;
		this.buffer = buffer;
		this.onEnded = onEnded;
		this.source = audioContext.createBufferSource();
		//var source = new AudioProcessorSource(audioContext, buffer, filter);
		this.source.connect(this.getInput());
		//init
		var segment = this.getSegment();
		this.duration = segment[1];
		var stretchRatio = this.getStretchRatio();
		this.source.buffer = this.getProcessedBuffer(segment, stretchRatio);
		//add parameters
		this.addParameter(PLAYBACK_RATE, this.source.playbackRate);
		this.addParameter(TIME_STRETCH_RATIO, {value:0});
		this.addParameter(LOOP, {value:0});
	}

	private getSegment() {
		var segment = [GlobalVars.DYMO_STORE.findFeatureValue(this.dymoUri, TIME_FEATURE), GlobalVars.DYMO_STORE.findFeatureValue(this.dymoUri, DURATION_FEATURE)];
		if (!segment[0]) {
			segment[0] = 0;
		}
		if (!segment[1] && this.buffer) {
			segment[1] = this.buffer.duration-segment[0];
		}
		var durationRatio = GlobalVars.DYMO_STORE.findParameterValue(this.dymoUri, DURATION_RATIO);
		if (durationRatio && 0 < durationRatio && durationRatio < 1) {
			segment[1] *= durationRatio;
		}
		return segment;
	}

	private getStretchRatio() {
		var timeStretchRatio = GlobalVars.DYMO_STORE.findParameterValue(this.dymoUri, TIME_STRETCH_RATIO);
		if (timeStretchRatio) {
			return timeStretchRatio;
		}
		return 1; //TODO THIS SHOULD BE STANDARD VALUE FROM GRAPH STORE
	}

	private getProcessedBuffer(segment, stretchRatio) {
		var time = segment[0];
		var duration = segment[1];
		if (stretchRatio != 1) {
			//get too much cause of shitty timestretch algorithm
			duration += this.SHITTY_TIMESTRETCH_BUFFER_ZONE;
		} else {
			//add time for fade after source officially done
			duration += GlobalVars.FADE_LENGTH;
		}
		if (!this.buffer && !isNaN(time+duration)) {
			//buffer doesn't exist, try to get from server
			this.requestBufferFromAudioServer(GlobalVars.DYMO_STORE.getSourcePath(this.dymoUri), time, time+duration, function(loadedBuffer) {
				return this.getStretchedAndFadedBuffer(loadedBuffer, duration, stretchRatio);
			});
		} else {
			//trim if buffer too long
			if (time != 0 || duration < this.buffer.duration) {
				this.buffer = this.getSubBuffer(this.buffer, this.toSamples(time, this.buffer), this.toSamples(duration, this.buffer));
			}
			return this.getStretchedAndFadedBuffer(this.buffer, duration, stretchRatio);
		}
	}

	private getStretchedAndFadedBuffer(buffer, duration, stretchRatio) {
		if (stretchRatio != 1) {
			buffer = new AudioProcessor(this.audioContext).timeStretch(buffer, stretchRatio);
			//trim it down again
			var shouldBeDuration = duration/stretchRatio;
			//add time for fade after source officially done
			buffer = this.getSubBuffer(buffer, 0, this.toSamples(shouldBeDuration+GlobalVars.FADE_LENGTH, buffer));
			duration = shouldBeDuration;
		}
		this.fadeBuffer(buffer, buffer.length);
		return buffer;
	}

	getDuration() {
		return this.duration;
	}

	isLoopingAndPlaying() {
		return this.source.loop && this.isPlaying;
	}

	play(startTime?: number) {
		this.source.onended = () => {
			//disconnect all nodes
			this.source.disconnect();
			this.removeAndDisconnect();
			if (this.onEnded) {
				this.onEnded(self);
			}
		};
		if (!startTime) {
			startTime = 0;
		}
		this.source.start(startTime);
		if (GlobalVars.DYMO_STORE.findParameterValue(this.dymoUri, LOOP)) {
			this.source.loop = true;
		}
		//console.log(startTime, audioContext.currentTime, source.loop)
		//source.start(startTime, currentPausePosition);
		this.isPlaying = true;
	}

	pause() {
		if (this.isPlaying) {
			this.stopAndRemoveAudioSources();
			this.currentPausePosition += this.audioContext.currentTime - this.startTime;
			this.isPaused = true;
		} else if (this.isPaused) {
			this.isPaused = false;
			this.play();
		}
	}

	stop() {
		if (this.isPlaying) {
			this.stopAndRemoveAudioSources();
		}
		//even in case it is paused
		this.currentPausePosition = 0;
	}

	private stopAndRemoveAudioSources() {
		this.isPlaying = false;
		var now = this.audioContext.currentTime;
		this.parameters[AMPLITUDE].setValueAtTime(this.parameters[AMPLITUDE].value, now);
		this.parameters[AMPLITUDE].linearRampToValueAtTime(0, now+GlobalVars.FADE_LENGTH);
		this.source.stop(now+2*GlobalVars.FADE_LENGTH);
	}

	private toSamples(seconds, buffer) {
		if (seconds || seconds == 0) {
			return Math.round(seconds*buffer.sampleRate);
		}
	}

	private getSubBuffer(buffer, fromSample, durationInSamples) {
		//console.log(buffer, buffer.numberOfChannels, buffer.length, fromSample, durationInSamples, buffer.sampleRate)
		var samplesToCopy = Math.min(buffer.length-fromSample, durationInSamples);
		var subBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, samplesToCopy, buffer.sampleRate);
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			var currentCopyChannel = subBuffer.getChannelData(i);
			var currentOriginalChannel = buffer.getChannelData(i);
			for (var j = 0; j < samplesToCopy; j++) {
				currentCopyChannel[j] = currentOriginalChannel[fromSample+j];
			}
		}
		return subBuffer;
	}

	private fadeBuffer(buffer, durationInSamples) {
		var fadeSamples = buffer.sampleRate*GlobalVars.FADE_LENGTH;
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			var currentChannel = buffer.getChannelData(i);
			for (var j = 0.0; j < fadeSamples; j++) {
				currentChannel[j] *= j/fadeSamples;
				currentChannel[durationInSamples-j-1] *= j/fadeSamples;
			}
		}
	}

	private requestBufferFromAudioServer(filename, from, to, callback) {
		var index = filename.lastIndexOf('/');
		if (index) {
			filename = filename.substring(index+1);
		}
		var query = "http://localhost:8060/getAudioChunk?filename=" + filename + "&fromSecond=" + from + "&toSecond=" + to;
		this.loadAudio(query, function(buffer) {
			callback(buffer);
		});
	}

	//PUT IN AUDIO TOOLS OR SO!!! (duplicate in scheduler)
	private loadAudio(path, callback) {
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = () => {
			this.audioContext.decodeAudioData(request.response, function(buffer) {
				callback(buffer);
			}, function(err) {
				console.log('audio from server is faulty');
			});
		};
		request.send();
	}

}
