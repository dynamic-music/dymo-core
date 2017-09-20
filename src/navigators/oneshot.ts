import { SubsetNavigator } from './subsetnav'
import { DONE } from '../globals/globals'

/**
 * A navigator that remembers whether its dymo was already requested or not (for artificial leaf nodes)
 */
export class OneShotNavigator extends SubsetNavigator {

	getCopy() {
		return new OneShotNavigator(this.dymoUri);
	}

	getNextParts() {
		return [[this.dymoUri], DONE];
	}

	getType() {
		return "OneShot";
	}

}
