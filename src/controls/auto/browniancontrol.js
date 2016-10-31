/**
 * A control based on brownian motion
 * @constructor
 * @extends {AutoControl}
 */
function BrownianControl(uri, initialValue) {

	var self = this;

	//init values and parameters
	if (!initialValue) {
		initialValue = 0.5;
	}
	var min = 0;
	var max = 1;

	AutoControl.call(this, uri, BROWNIAN, function() {
		var currentMaxStepSize = DYMO_STORE.findParameterValue(uri, BROWNIAN_MAX_STEP_SIZE);
		var currentStep = (2 * currentMaxStepSize * Math.random()) - currentMaxStepSize;
		var newValue = self.getValue() + currentStep;
		newValue = Math.min(Math.max(newValue, min), max);
		self.update(newValue);
	});
	DYMO_STORE.addParameter(uri, BROWNIAN_MAX_STEP_SIZE, 0.1, self);
	this.update(initialValue);
	this.startUpdate();

}
inheritPrototype(BrownianControl, AutoControl);
