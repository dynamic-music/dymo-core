import { RAMP, AUTO_CONTROL_FREQUENCY } from '../../globals/uris'
import { AutoControl } from '../autocontrol'
import { GlobalVars } from '../../globals/globals'

/**
 * Ramp controls that gradually interpolate between given values.
 */
export class RampControl extends AutoControl {

	private duration;
	private currentValue;
	private isIncreasing;

	constructor(uri, duration, initialValue) {
		super(uri, RAMP);
		this.duration = duration ? duration : 10000;
		this.currentValue = initialValue ? initialValue : 0;
		this.isIncreasing = this.currentValue != 1;
		this.updateValue(this.currentValue);
	}

	update() {
		//TODO IMPROVE, ONLY CALCULATE WHEN FREQUENCY CHANGES!!!
		var delta = 1/this.duration*Number(GlobalVars.DYMO_STORE.findParameterValue(this.uri, AUTO_CONTROL_FREQUENCY));
		if (!this.isIncreasing) {
			delta *= -1;
		}
		this.currentValue += delta;
		if (0 < this.currentValue && this.currentValue < 1) {
			this.updateValue(this.currentValue);
		} else if (this.currentValue >= 1) {
			this.updateValue(1);
			this.reset();
		} else if (this.currentValue <= 0) {
			this.updateValue(0);
			this.reset();
		}
	}

	reset() {
		super.reset();
		this.isIncreasing = !this.isIncreasing;
	}

}
