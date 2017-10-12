import { SoundTouchStretcher } from './processing/soundtouch-stretcher';
import { TimeStretcher } from './processing/time-stretcher';

/**
 * Offers some audio processing functions such as time stretching.
 */
export class AudioProcessor {

	private audioContext;
	private timeStretcher;

	constructor(
		audioContext: AudioContext,
		stretcher: TimeStretcher = new SoundTouchStretcher()
	) {
		this.audioContext = audioContext;
		this.timeStretcher = stretcher
	}

	timeStretch(buffer, ratio) {
		var goalBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length*(1/ratio), buffer.sampleRate);
		return this.timeStretcher.timeStretch(buffer, goalBuffer, ratio);
	}

}