/**
 * Autocontrols that use statistics to set their values.
 * @abstract
 */
class AutoControl extends Control {

	/** @param {number=} frequency */
	constructor(uri, name, frequency) {
		super(uri, name, AUTO_CONTROL);
		if (!frequency) frequency = 100;
		DYMO_STORE.addParameter(uri, AUTO_CONTROL_FREQUENCY, frequency, this);
		DYMO_STORE.addParameter(uri, AUTO_CONTROL_TRIGGER, 0, this);
		this.intervalID = null;
	}

	/** @param {number=} frequency (optional) */
	startUpdate(frequency) {
		if (!frequency) {
			frequency = DYMO_STORE.findParameterValue(this.uri, AUTO_CONTROL_FREQUENCY);
		}
		this.intervalID = setInterval(() => this.update(), frequency);
	}

	/** @abstract */
	update() {}

	reset() {
		clearInterval(this.intervalID);
		this.intervalID = null;
	}

	observedValueChanged(paramUri, paramType, value) {
		if (paramType == AUTO_CONTROL_FREQUENCY) {
			if (this.intervalID) {
				this.reset();
				this.startUpdate(value);
			}
		} else if (paramType == AUTO_CONTROL_TRIGGER) {
			if (!this.intervalID && value > 0) {
				this.startUpdate();
			} else if (this.intervalID && value == 0) {
				this.reset();
			}
		}
	}

}
