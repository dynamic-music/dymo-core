/**
 * Ramp controls that gradually interpolate between given values.
 * @constructor
 * @extends {AutoControl}
 */
function RampControl(duration, initialValue) {
	
	var self = this;
	if (!duration) {
		duration = 10000;
	}
	var currentValue = 0;
	if (initialValue) {
		currentValue = initialValue;
	}
	var isIncreasing = currentValue != 1;
	
	AutoControl.call(this, RAMP, function() {
		var delta = 1/duration*self.getParameter(AUTO_CONTROL_FREQUENCY).getValue();
		if (!isIncreasing) {
			delta *= -1;
		}
		currentValue += delta;
		if (0 < currentValue && currentValue < 1) {
			self.update(currentValue);
		} else if (currentValue >= 1) {
			self.update(1);
			self.reset();
		} else if (currentValue <= 0) {
			self.update(0);
			self.reset();
		}
	}, function() {
		isIncreasing = !isIncreasing;
	});
	this.update(currentValue);
	
}
inheritPrototype(RampControl, AutoControl);