/**
 * A control based on brownian motion
 * @constructor
 * @extends {AutoControl}
 */
function BrownianControl(initialValue) {
	
	var self = this;
	
	//init values and parameters
	if (!initialValue) {
		initialValue = 0.5;
	}
	var min = 0;
	var max = 1;
	
	AutoControl.call(this, BROWNIAN, function() {
		var currentMaxStepSize = self.getParameter(BROWNIAN_MAX_STEP_SIZE).getValue();
		var currentStep = (2 * currentMaxStepSize * Math.random()) - currentMaxStepSize;
		var newValue = self.getValue() + currentStep;
		newValue = Math.min(Math.max(newValue, min), max);
		self.update(newValue);
	});
	this.addParameter(new Parameter(BROWNIAN_MAX_STEP_SIZE, 0.1));
	this.update(initialValue);
	this.startUpdate();
	
}
inheritPrototype(BrownianControl, AutoControl);