import { SoundTouch, SimpleFilter } from 'soundtouch-js'

/**
 * Offers some audio processing functions such as time stretching.
 */
export class AudioProcessor {

	private readonly BUFFER_SIZE = 1024;
	private audioContext;

	constructor(audioContext) {
		this.audioContext = audioContext;
	}

	timeStretch(buffer, ratio) {
		var soundTouch = new SoundTouch(buffer.sampleRate);
		soundTouch.tempo = ratio;
		var source = this.createSource(buffer);
		var filter = new SimpleFilter(source, soundTouch);
		var result = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length*(1/ratio), buffer.sampleRate);
		this.calculateStretched(buffer, result, filter);
		return result;
	}

	private createSource(buffer) {
		return {
			extract: function (target, numFrames, position) {
				var channels = [];
				for (var i = 0; i < buffer.numberOfChannels; i++) {
					channels.push(buffer.getChannelData(i));
				}
				for (var i = 0; i < numFrames; i++) {
					for (var j = 0; j < channels.length; j++) {
						target[i * channels.length + (j % channels.length)] = channels[j][i + position];
					}
				}
				return Math.min(numFrames, channels[0].length - position);
			}
		};
	}

	private calculateStretched(buffer, target, filter) {
		var channels = [];
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			channels.push(target.getChannelData(i));
		}
		var samples = new Float32Array(this.BUFFER_SIZE * 2);
		var framesExtracted = filter.extract(samples, this.BUFFER_SIZE);
		var totalFramesExtracted = 0;
		while (framesExtracted) {
			for (var i = 0; i < framesExtracted; i++) {
				for (var j = 0; j < channels.length; j++) {
					channels[j][i + totalFramesExtracted] = samples[i * channels.length + (j % channels.length)];
				}
			}
			totalFramesExtracted += framesExtracted;
			framesExtracted = filter.extract(samples, this.BUFFER_SIZE);
		}
		return channels;
	}

	/*node.onaudioprocess = function (e) {
		var channels = [];
		for (var i = 0; i < buffer.numberOfChannels; i++) {
			channels.push(e.outputBuffer.getChannelData(i));
		}
		var framesExtracted = f.extract(samples, BUFFER_SIZE);
		if (framesExtracted == 0) {
			self.stop();
		}
		for (var i = 0; i < framesExtracted; i++) {
			for (var j = 0; j < channels.length; j++) {
				channels[j][i] = samples[i * channels.length + (j % channels.length)];
			}
		}
	};*/

}