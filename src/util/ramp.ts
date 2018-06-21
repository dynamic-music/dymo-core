/**
 * A ramp utility that calls a given function repeatedly until interrupted.
 * Used in semantic player so far (could be used to smoothen dymo parameters)
 * @constructor
 */
export class Ramp {

	private intervalID;
	private delta;
	private currentValue = 0;

	setValue(value) {
		this.currentValue = value;
	}

	startOrUpdate(targetValue, duration, frequency, callback) {
		if (duration > frequency) {
			clearInterval(this.intervalID);
			this.delta = (targetValue-this.currentValue)/(duration/frequency);
			this.intervalID = setInterval(() => {
				var nextValue = this.currentValue+this.delta;
				if (Math.abs(targetValue-nextValue) < Math.abs(targetValue-this.currentValue)) {
					this.currentValue = nextValue;
					callback(this.currentValue);
				} else {
					//can't get closer..
					clearInterval(this.intervalID);
				}
			}, frequency);
		}/* else {
			this.currentValue = targetValue;
			callback(this.currentValue);
		}*/
	}

}
