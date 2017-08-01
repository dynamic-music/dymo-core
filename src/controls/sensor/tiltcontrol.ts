import { SensorControl } from '../sensorcontrol'
import { TILT_X, TILT_Y } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A tilt control based on an accelerometer dimension
 */
export class TiltControl extends SensorControl {

	private readonly TILT_SENSITIVITY = 0.1;

	constructor(dimension, store: DymoStore) {
		super(dimension,
			"$cordovaDeviceMotion",
			"watchAcceleration",
			acceleration => {
				var delta;
				if (dimension == TILT_X) {
					delta = acceleration.x;
				} else if (dimension == TILT_Y) {
					delta = acceleration.y;
				}
				delta = this.normalizeAcceleration(delta);
				var newValue = this.getValue() + this.TILT_SENSITIVITY*(2*delta-1);//counteract normalization
				if (isNaN(newValue)) {
					newValue = 0;
				}
				this.updateValue(newValue);
			},
			store
		);
	}

	// normalizes acceleration to interval [0,1]
	private normalizeAcceleration(acceleration) {
		return (acceleration / 9.81 + 1) / 2;
	}

}
