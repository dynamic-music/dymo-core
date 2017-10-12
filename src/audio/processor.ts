import { SoundTouchStretcher } from './processing/soundtouch-stretcher';

/**
 * Offers some audio processing functions such as time stretching.
 */
export class AudioProcessor {

	private audioContext;
	private timeStretcher;

	constructor(audioContext) {
		this.audioContext = audioContext;
		this.timeStretcher = new SoundTouchStretcher(audioContext);
	}

	timeStretch(buffer, ratio) {
		var goalBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length*(1/ratio), buffer.sampleRate);
		return this.timeStretcher.timeStretch(buffer, goalBuffer, ratio);
	}

}