import { AUTO_CONTROL, AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER, VALUE } from '../globals/uris';
import { Control } from '../model/control';
import { SuperDymoStore } from '../globals/types';

/**
 * Autocontrols that use statistics to set their values.
 * @abstract
 */
export abstract class AutoControl extends Control {

	private intervalID;
	protected frequency;

	constructor(uri, name, store: SuperDymoStore) {
		super(uri, name, AUTO_CONTROL, store);
		this.init();
	}

	protected async init() {
		this.intervalID = null;
		if (!this.frequency) this.frequency = await this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY);
		if (!this.frequency) this.frequency = 100;
		const freqUri = await this.store.setControlParam(this.uri, AUTO_CONTROL_FREQUENCY, this.frequency);
		this.store.addValueObserver(freqUri, VALUE, this);
		const triggUri = await this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 0);
		this.store.addValueObserver(triggUri, VALUE, this);
		//CANNOT START UPDATE HERE! NEEDS TO BE STARTED FROM UI! this.startUpdate();
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

	observedValueChanged(paramUri: string, paramType: string, value) {
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
