import { SensorControl } from '../sensorcontrol'
import { ACCELEROMETER_X, ACCELEROMETER_Y } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on an accelerometer dimension
 */
export class AccelerometerControl extends SensorControl {

	constructor(dimension, store: DymoStore) {
		super(dimension,
			"$cordovaDeviceMotion",
			"watchAcceleration",
			acceleration => {
				var newValue;
				if (dimension == ACCELEROMETER_X) {
					newValue = acceleration.x;
				} else if (dimension == ACCELEROMETER_Y) {
					newValue = acceleration.y;
				} else {
					newValue = acceleration.z;
				}
				this.updateValue(this.normalizeAcceleration(newValue));
			},
			store
		);
	}

	// normalizes acceleration to interval [0,1]
	private normalizeAcceleration(acceleration) {
		return (acceleration / 9.81 + 1) / 2;
	}

}
