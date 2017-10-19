import { SensorControl } from '../sensorcontrol'
import { ACCELEROMETER_X, ACCELEROMETER_Y } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on an accelerometer dimension
 */
export class AccelerometerControl extends SensorControl {

	constructor(uri: string, dimension: string, store: DymoStore) {
		super(uri, dimension,
			"$cordovaDeviceMotion",
			"watchAcceleration",
			acceleration => {
				/*var newValue;
				if (dimension == ACCELEROMETER_X) {
					newValue = acceleration.x;
				} else if (dimension == ACCELEROMETER_Y) {
					newValue = acceleration.y;
				} else {
					newValue = acceleration.z;
				}*/
				this.updateValue(this.normalizeAcceleration(acceleration));
			},
			store
		);
	}

	// normalizes acceleration to interval [0,1]
	private normalizeAcceleration(acceleration) {
		return (acceleration / 9.81 + 1) / 2;
	}

}
