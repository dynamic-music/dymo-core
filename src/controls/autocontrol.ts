import { AUTO_CONTROL, AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER } from '../globals/uris';
import { Control } from '../model/control';
import { DymoStore } from '../io/dymostore';

/**
 * Autocontrols that use statistics to set their values.
 * @abstract
 */
export abstract class AutoControl extends Control {

	private intervalID;
	protected frequency;

	constructor(uri, name, store: DymoStore) {
		super(uri, name, AUTO_CONTROL, store);
		this.frequency = 100;
		this.intervalID = null;
		this.store.setControlParam(this.uri, AUTO_CONTROL_FREQUENCY, this.frequency, this);
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 0, this);
	}

	startUpdate() {
		if (!this.frequency) {
			this.frequency = Number(this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY));
		}
		this.update();
		this.intervalID = setInterval(() => this.update(), this.frequency);
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
				this.frequency = value;
				this.startUpdate();
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
