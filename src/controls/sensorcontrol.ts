import { Observable } from 'rxjs/Rx';
import { AUTO_CONTROL_FREQUENCY } from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Control } from '../model/control';
import { Ramp } from '../util/ramp';

export var UNAVAILABLE = "unavailable";
export var CALIBRATING = "calibrating";

export interface Sensor {
	watch: Observable<number>;
}

/**
 * Sensor controls that read their values from sensors.
 */
export class SensorControl extends Control {

	private sensor: Sensor;
	private subscription;
	private updateFunction;
	private resetFunction;
	private options;
	private referenceValue;
	private referenceAverageOf;
	private averageOf;
	private previousValues;
	private previousUpdateTime;
	private ramp;
	private status = UNAVAILABLE;

	private watch;

	constructor(uri: string, typeUri: string, sensorName, watchFunctionName, updateFunction, store: DymoStore, resetFunction?: Function, options?: Object) {
		super(uri, typeUri, typeUri, store);
		this.updateFunction = updateFunction;
		this.resetFunction = resetFunction;
		this.options = options;
	}

	setSensor(sensor: Sensor) {
		this.sensor = sensor;
	}

	getSensor() {
		return this.sensor;
	}

	getStatus() {
		return this.status;
	}

	getReferenceValue() {
		return this.referenceValue;
	}

	setReferenceAverageOf(count) {
		this.referenceAverageOf = count;
		this.resetReferenceValueAndAverage();
	}

	setAverageOf(count) {
		this.averageOf = count;
		this.resetReferenceValueAndAverage();
	}

	setSmooth(smooth) {
		if (smooth) {
			this.ramp = new Ramp();
		} else {
			this.ramp = undefined;
		}
	}

	resetReferenceValueAndAverage() {
		this.referenceValue = undefined;
		this.resetValue();
		this.status = UNAVAILABLE;
		this.previousValues = [];
	}

	startUpdate() {
		if (!this.options) {
			var freq = this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY);
			this.options = { frequency: freq? freq: 100 };
		}
		if (this.sensor) {
			this.subscription = this.sensor.watch.subscribe(data => {
				this.updateFunction(data);
			});
		} else {
			console.log(this.uri + " " + UNAVAILABLE);
		}
	}

	update(newValue) {
		this.status = CALIBRATING;
		//still measuring reference value
		if (this.referenceAverageOf && this.previousValues.length < this.referenceAverageOf) {
			this.previousValues.push(newValue);
			//done collecting values. calculate average and adjust previous values
			if (this.previousValues.length == this.referenceAverageOf) {
				this.referenceValue = this.getAverage(this.previousValues);
				this.previousValues = this.previousValues.map(a => a - this.referenceValue);
			}
		//done measuring. adjust value if initialvalue taken
		} else {
			//take value relative to referenceValue (optional)
			if (this.referenceValue) {
				newValue -= this.referenceValue;
			}
			//take average of last averageOf values (optional)
			if (this.averageOf) {
				this.previousValues.push(newValue);
				//remove oldest unneeded values
				while (this.previousValues.length > this.averageOf) {
					this.previousValues.shift();
				}
				//calculate average
				if (this.previousValues.length == this.averageOf) {
					newValue = this.getAverage(this.previousValues);
				}
			}
			//update via smoothing ramp (optional)
			if (this.ramp) {
				var now = Date.now();
				var duration;
				if (!this.previousUpdateTime) {
					duration = 1000; //one second initially
				} else {
					duration = now-this.previousUpdateTime;
				}
				this.startUpdateRamp(newValue, duration);
				this.previousUpdateTime = now;
			} else {
				//call regular super method
				this.updateValue(newValue);
			}
		}
	}

	private getAverage(list) {
		var sum = list.reduce((a, b) => a + b);
		return sum / list.length;
	}

	private startUpdateRamp(targetValue, duration) {
		var frequency = this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY);
		this.ramp.startOrUpdate(targetValue, duration, frequency? frequency: 100, value => {
			//call regular super method
			this.updateValue(value);
		});
	}

	reset() {
		if (this.subscription) {
			this.subscription.unsubscribe();
			this.subscription = null;
			if (this.resetFunction) {
				this.resetFunction();
			}
		}
	}

	private onError() {
		console.log(this.uri + ' control error!');
	}

}
