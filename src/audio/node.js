/**
 * Represents a non-leaf dymo (no source) and manages all Web Audio nodes necessary to suit the dymo's parameters.
 * @constructor
 */
function DymoNode(dymoUri, audioContext, reverbSend, delaySend) {

	this.POSITION_PARAMS = [PAN, HEIGHT, DISTANCE];

	this.dymoUri = dymoUri;
	this.parameters = {};

	this.init(audioContext, reverbSend, delaySend);

}

/** @private */
DymoNode.prototype.init = function(audioContext, reverbSend, delaySend) {
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
	if (DYMO_STORE.findParameterUri(this.dymoUri, PAN)
			|| DYMO_STORE.findParameterUri(this.dymoUri, HEIGHT)
			|| DYMO_STORE.findParameterUri(this.dymoUri, DISTANCE)) {
		this.panner = audioContext.createPanner();
		this.panner.connect(this.dryGain);
		this.addParameter(PAN, {value:0}); //mock parameters since panner non-readable
		this.addParameter(HEIGHT, {value:0});
		this.addParameter(DISTANCE, {value:0});
	}
	//create filter module
	if (DYMO_STORE.findParameterUri(this.dymoUri, FILTER)) {
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

/** @private */
DymoNode.prototype.createGain = function(audioContext, source, sink) {
	var newGain = audioContext.createGain();
	newGain.connect(sink);
	newGain.gain.value = 0;
	source.connect(newGain);
	return newGain;
}

/** should only be used by this and subclasses */
DymoNode.prototype.addParameter = function(paramType, webAudioParam) {
	DYMO_STORE.addParameterObserver(this.dymoUri, paramType, this);
	this.parameters[paramType] = webAudioParam;
	var paramValue = DYMO_STORE.findParameterValue(this.dymoUri, paramType);
	if (paramValue != null) {
		this.setParameter(paramType, paramValue);
	}
}

/** @private */
DymoNode.prototype.setParameter = function(paramType, value) {
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

DymoNode.prototype.getDymoUri = function() {
	return this.dymoUri;
}

DymoNode.prototype.observedValueChanged = function(paramUri, paramType, value) {
	this.setParameter(paramType, value);
}

DymoNode.prototype.getParameterValue = function(name) {
	if (this.parameters[name]) {
		if (this.parameters[name].value || this.parameters[name].value == 0) {
			return this.parameters[name].value;
		} else {
			return this.parameters[name].getValue();
		}
	}
}

DymoNode.prototype.getInput = function() {
	if (this.filter) {
		return this.filter;
	} else if (this.panner) {
		return this.panner;
	}
	return this.dryGain;
}

DymoNode.prototype.connect = function(sink) {
	this.dryGain.connect(sink);
}

DymoNode.prototype.removeAndDisconnect = function() {
	//remove from observed parameters
	for (var p in this.parameters) {
		DYMO_STORE.removeParameterObserver(this.dymoUri, p, this);
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
