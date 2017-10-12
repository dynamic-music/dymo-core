export abstract class TimeStretcher {
	abstract timeStretch(sourceBuffer: AudioBuffer, goalBuffer: AudioBuffer, ratio: number): void;

}