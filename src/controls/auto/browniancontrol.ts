import { BROWNIAN, BROWNIAN_MAX_STEP_SIZE, AUTO_CONTROL_TRIGGER } from '../../globals/uris';
import { DymoStore } from '../../io/dymostore-service';
import { AutoControl } from '../autocontrol';

/**
 * A control based on brownian motion
 */
export class BrownianControl extends AutoControl {

	private min;
	private max;

	constructor(uri: string, store: DymoStore, initialValue?: number) {
		super(uri, BROWNIAN, store);
		this.store.setControlParam(this.uri, BROWNIAN_MAX_STEP_SIZE, 0.1, this);
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 1);
		//init values and parameters
		if (!initialValue) {
			initialValue = 0.5;
		}
		this.min = 0;
		this.max = 1;
		this.updateValue(initialValue);
	}

	async update() {
		var currentMaxStepSize = Number(await this.store.findControlParamValue(this.uri, BROWNIAN_MAX_STEP_SIZE));
		var currentStep = (2 * currentMaxStepSize * Math.random()) - currentMaxStepSize;
		var newValue = this.getValue() + currentStep;
		newValue = Math.min(Math.max(newValue, this.min), this.max);
		this.updateValue(newValue);
	}

}
