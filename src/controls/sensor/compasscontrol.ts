import { SensorControl } from '../sensorcontrol'
import { COMPASS_HEADING } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on true compass heading
 */
export class CompassControl extends SensorControl {

	constructor(store: DymoStore) {
		super(COMPASS_HEADING,
			"$cordovaDeviceOrientation",
			"watchHeading",
			heading => this.updateValue(heading.trueHeading),
			store,
			() => this.resetReferenceValueAndAverage(),
		);
		this.setReferenceAverageOf(3);
	}

}
