export abstract class TimeStretcher {
  
	private audioContext;

	constructor(audioContext) {
		this.audioContext = audioContext;
	}

	abstract timeStretch(sourceBuffer: AudioBuffer, goalBuffer: AudioBuffer, ratio: number): void;

}