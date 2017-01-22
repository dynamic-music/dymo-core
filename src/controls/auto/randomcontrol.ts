import { RANDOM, AUTO_CONTROL_TRIGGER } from '../../globals/uris'
import { AutoControl } from '../autocontrol'
import { GlobalVars } from '../../globals/globals'

/**
 * Random control outputs random values between 0 and 1.
 */
export class RandomControl extends AutoControl {

	constructor(uri) {
		super(uri, RANDOM);
		GlobalVars.DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		this.updateValue(Math.random());
	}

}
