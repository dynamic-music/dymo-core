import { RANDOM, AUTO_CONTROL_TRIGGER } from '../../globals/uris';
import { SuperDymoStore } from '../../globals/types';
import { AutoControl } from '../autocontrol';

/**
 * Random control outputs random values between 0 and 1.
 */
export class RandomControl extends AutoControl {

	constructor(uri: string, store: SuperDymoStore) {
		super(uri, RANDOM, store);
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		this.updateValue(Math.random());
	}

}
