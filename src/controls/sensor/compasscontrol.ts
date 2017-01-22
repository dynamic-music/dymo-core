import { SensorControl } from '../sensorcontrol'
import { COMPASS_HEADING } from '../../globals/uris'

/**
 * A control based on true compass heading
 */
export class CompassControl extends SensorControl {

	constructor() {
		super(COMPASS_HEADING,
			"$cordovaDeviceOrientation",
			"watchHeading",
			heading => this.updateValue(heading.trueHeading),
			() => this.resetReferenceValueAndAverage()
		);
		this.setReferenceAverageOf(3);
	}

}
