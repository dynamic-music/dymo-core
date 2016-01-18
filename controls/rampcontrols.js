function RampControls() {
	
	var self = this;
	this.frequency = 100;
	this.duration = 5000;
	var currentValue = 0;
	
	var parameters = {};
	parameters[RAMP_TRIGGER] = new Parameter(RAMP_TRIGGER, 0);
	parameters[RAMP_TRIGGER].addObserver(this);
	this.linearRampControl = new Control(RAMP, AUTO_CONTROL, parameters);
	var intervalID;
	
	function startUpdate() {
		intervalID = setInterval(function() {
			currentValue += 1/self.duration*self.frequency;
			if (currentValue <= 1) {
				self.linearRampControl.update(currentValue);
			} else {
				self.linearRampControl.update(1);
				reset();
			}
		}, self.frequency);
	}
	
	function reset() {
		clearInterval(intervalID);
		currentValue = 0;
	}
	
	this.getParameter = function(name) {
		return parameters[name];
	}
	
	this.observedParameterChanged = function(param) {
		if (param.getName() == RAMP_TRIGGER) {
			if (currentValue != 0) {
				reset();
			} else {
				startUpdate();
			}
		}
	}
	
}