import { AMPLITUDE, PAN, HEIGHT, DISTANCE, REVERB, DELAY, FILTER } from '../globals/uris';
import { DymoStore } from '../io/dymostore';

/**
 * Represents a non-leaf dymo (no source) and manages all Web Audio nodes necessary to suit the dymo's parameters.
 */
export class DymoNode {

	private readonly POSITION_PARAMS = [PAN, HEIGHT, DISTANCE];
	protected dymoUri;
	protected parameters = {};
	private dryGain;
	private reverbGain;
	private delayGain;
	private panner;
	private filter;

	constructor(dymoUri, audioContext, reverbSend, delaySend, protected store: DymoStore) {
		this.dymoUri = dymoUri;
		this.init(audioContext, reverbSend, delaySend);
	}

	private init(audioContext, reverbSend, delaySend) {
		//create amplitude module
		this.dryGain = audioContext.createGain();
		//this.dryGain.connect(audioContext.destination);
		this.addParameter(AMPLITUDE, this.dryGain.gain);
		//create reverb module
		if (reverbSend) {
			this.reverbGain = this.createGain(audioContext, this.dryGain, reverbSend);
			this.addParameter(REVERB, this.reverbGain.gain);
		}
		//create delay module
		if (delaySend) {
			this.delayGain = this.createGain(audioContext, this.dryGain, delaySend);
			this.addParameter(DELAY, this.delayGain.gain);
		}
		//create panner module
		if (this.store.findParameterUri(this.dymoUri, PAN)
				|| this.store.findParameterUri(this.dymoUri, HEIGHT)
				|| this.store.findParameterUri(this.dymoUri, DISTANCE)) {
			this.panner = audioContext.createPanner();
			this.panner.connect(this.dryGain);
			this.addParameter(PAN, {value:0}); //mock parameters since panner non-readable
			this.addParameter(HEIGHT, {value:0});
			this.addParameter(DISTANCE, {value:0});
		}
		//create filter module
		if (this.store.findParameterUri(this.dymoUri, FILTER)) {
			this.filter = audioContext.createBiquadFilter();
			this.filter.type = "lowpass";
			this.filter.frequency.value = 20000;
			if (this.panner) {
				this.filter.connect(this.panner);
			} else {
				this.filter.connect(this.dryGain);
			}
			this.addParameter(FILTER, this.filter.frequency);
		}
	}

	private createGain(audioContext, source, sink) {
		var newGain = audioContext.createGain();
		newGain.connect(sink);
		newGain.gain.value = 0;
		source.connect(newGain);
		return newGain;
	}

	protected addParameter(paramType, webAudioParam) {
		this.store.addParameterObserver(this.dymoUri, paramType, this);
		this.parameters[paramType] = webAudioParam;
		var paramValue = this.store.findParameterValue(this.dymoUri, paramType);
		if (paramValue != null) {
			this.setParameter(paramType, paramValue);
		}
	}

	private setParameter(paramType, value) {
		if (!isNaN(value)) {
			if (this.parameters[paramType]) {
				if (this.parameters[paramType].value || this.parameters[paramType].value == 0) {
					this.parameters[paramType].value = value;
				} else {
					this.parameters[paramType].setValue(value);
				}
			}
			if (this.POSITION_PARAMS.indexOf(paramType) >= 0 && this.parameters[PAN] && this.parameters[HEIGHT] && this.parameters[DISTANCE]) {
				if (this.parameters[DISTANCE].value == 0) {
					this.parameters[DISTANCE].value = -0.01; //for chrome :( source not audible at z = 0
				}
				this.panner.setPosition(this.parameters[PAN].value, this.parameters[HEIGHT].value, this.parameters[DISTANCE].value);
			}
		}
	}

	getDymoUri() {
		return this.dymoUri;
	}

	observedValueChanged(paramUri, paramType, value) {
		this.setParameter(paramType, value);
	}

	getParameterValue(name) {
		if (this.parameters[name]) {
			if (this.parameters[name].value || this.parameters[name].value == 0) {
				return this.parameters[name].value;
			} else {
				return this.parameters[name].getValue();
			}
		}
	}

	getInput() {
		if (this.filter) {
			return this.filter;
		} else if (this.panner) {
			return this.panner;
		}
		return this.dryGain;
	}

	connect(sink) {
		this.dryGain.connect(sink);
	}

	removeAndDisconnect() {
		//remove from observed parameters
		for (var p in this.parameters) {
			this.store.removeParameterObserver(this.dymoUri, p, this);
		}
		//disconnect audio nodes
		this.dryGain.disconnect();
		if (this.reverbGain) {
			this.reverbGain.disconnect();
		}
		if (this.delayGain) {
			this.delayGain.disconnect();
		}
	}

}