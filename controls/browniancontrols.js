function BrownianControls() {
	
	var self = this;
	
	this.frequency = new Parameter(BROWNIAN_FREQUENCY, 100);
	this.frequency.addObserver(this);
	this.maxStepSize = new Parameter(BROWNIAN_MAX_STEP_SIZE, 0.1);
	this.maxStepSize.addObserver(this);
	this.brownianControl = new Control(BROWNIAN, AUTO_CONTROL);
	this.brownianControl.update(0.5);
	var min = 0;
	var max = 1;
	var intervalID;
	
	startUpdate();
	
	function startUpdate() {
		intervalID = setInterval(function() {
			var currentStep = self.maxStepSize.getValue() * Math.random();
			var newValue = self.brownianControl.getValue() + currentStep;
			newValue = Math.min(Math.max(newValue, min), max);
			self.brownianControl.update(newValue);
		}, self.frequency.getValue());
	}
	
	this.observedParameterChanged = function(param) {
		if (param.getName() == BROWNIAN_FREQUENCY) {
			clearInterval(intervalID);
			startUpdate();
		}
	}
	
}