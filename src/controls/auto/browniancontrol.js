/**
 * A control based on brownian motion
 */
class BrownianControl extends AutoControl {

	constructor(uri, initialValue) {
		super(uri, BROWNIAN);
		//init values and parameters
		if (!initialValue) {
			initialValue = 0.5;
		}
		this.min = 0;
		this.max = 1;
		DYMO_STORE.addParameter(uri, BROWNIAN_MAX_STEP_SIZE, 0.1, self);
		this.updateValue(initialValue);
		DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		var currentMaxStepSize = DYMO_STORE.findParameterValue(this.uri, BROWNIAN_MAX_STEP_SIZE);
		var currentStep = (2 * currentMaxStepSize * Math.random()) - currentMaxStepSize;
		var newValue = this.getValue() + currentStep;
		newValue = Math.min(Math.max(newValue, this.min), this.max);
		this.updateValue(newValue);
	}

}
