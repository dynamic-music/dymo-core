/**
 * A ramp utility that calls a given function repeatedly until interrupted.
 * Used in semantic player so far (could be used to smoothen dymo parameters)
 * @constructor
 */
function Ramp() {

	var intervalID;
	var delta;
	var currentValue = 0;

	this.setValue = function(value) {
		currentValue = value;
	}

	this.startOrUpdate = function(targetValue, duration, frequency, callback) {
		if (duration > frequency) {
			clearInterval(intervalID);
			delta = (targetValue-currentValue)/(duration/frequency);
			intervalID = setInterval(function() {
				var nextValue = currentValue+delta;
				if (Math.abs(targetValue-nextValue) < Math.abs(targetValue-currentValue)) {
					currentValue = nextValue;
					callback(currentValue);
				} else {
					//can't get closer..
					clearInterval(intervalID);
				}
			}, frequency);
		}/* else {
			currentValue = targetValue;
			callback(currentValue);
		}*/
	}

}
