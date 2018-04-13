import { AUTO_CONTROL, AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER } from '../globals/uris';
import { Control } from '../model/control';
import { DymoStore } from '../io/dymostore-service';

/**
 * Autocontrols that use statistics to set their values.
 * @abstract
 */
export abstract class AutoControl extends Control {

	private intervalID;
	protected frequency;

	constructor(uri, name, store: DymoStore) {
		super(uri, name, AUTO_CONTROL, store);
		this.init();
	}

	private async init() {
		this.intervalID = null;
		this.frequency = await this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY);
		if (!this.frequency) this.frequency = 100;
		this.store.setControlParam(this.uri, AUTO_CONTROL_FREQUENCY, this.frequency, this);
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 0, this);
	}

	startUpdate(newFrequency?: number) {
		if (this.intervalID) {
			this.reset();
		}
		if (newFrequency) {
			this.frequency = newFrequency;
		}
		this.update();
		this.intervalID = setInterval(() => this.update(), this.frequency);
	}

	abstract async update();

	reset() {
		clearInterval(this.intervalID);
		this.intervalID = null;
	}

	observedValueChanged(paramUri, paramType, value) {
		if (paramType == AUTO_CONTROL_FREQUENCY) {
			this.frequency = value;
			//restart with new frequency if already running
			if (this.intervalID) {
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
