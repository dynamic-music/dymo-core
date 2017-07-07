import { BROWNIAN, BROWNIAN_MAX_STEP_SIZE, AUTO_CONTROL_TRIGGER } from '../../globals/uris'
import { AutoControl } from '../autocontrol'
import { GlobalVars } from '../../globals/globals'

/**
 * A control based on brownian motion
 */
export class BrownianControl extends AutoControl {

	private min;
	private max;

	constructor(uri: string, initialValue?: number) {
		super(uri, BROWNIAN);
		//init values and parameters
		if (!initialValue) {
			initialValue = 0.5;
		}
		this.min = 0;
		this.max = 1;
		GlobalVars.DYMO_STORE.addParameter(uri, BROWNIAN_MAX_STEP_SIZE, 0.1, this);
		this.updateValue(initialValue);
		GlobalVars.DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		var currentMaxStepSize = Number(GlobalVars.DYMO_STORE.findParameterValue(this.uri, BROWNIAN_MAX_STEP_SIZE));
		var currentStep = (2 * currentMaxStepSize * Math.random()) - currentMaxStepSize;
		var newValue = this.getValue() + currentStep;
		newValue = Math.min(Math.max(newValue, this.min), this.max);
		this.updateValue(newValue);
	}

}
