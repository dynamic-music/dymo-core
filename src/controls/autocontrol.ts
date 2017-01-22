import { AUTO_CONTROL, AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER } from '../globals/uris'
import { GlobalVars } from '../globals/globals'
import { Control } from '../model/control'

/**
 * Autocontrols that use statistics to set their values.
 * @abstract
 */
export abstract class AutoControl extends Control {

	private intervalID;

	constructor(uri, name, frequency?: number) {
		super(uri, name, AUTO_CONTROL);
		if (!frequency) frequency = 100;
		GlobalVars.DYMO_STORE.addParameter(uri, AUTO_CONTROL_FREQUENCY, frequency, this);
		GlobalVars.DYMO_STORE.addParameter(uri, AUTO_CONTROL_TRIGGER, 0, this);
		this.intervalID = null;
	}

	startUpdate(frequency?: number) {
		if (!frequency) {
			frequency = Number(GlobalVars.DYMO_STORE.findParameterValue(this.uri, AUTO_CONTROL_FREQUENCY));
		}
		this.update();
		this.intervalID = setInterval(() => this.update(), frequency);
	}

	abstract update();

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
