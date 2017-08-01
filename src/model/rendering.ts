import { GlobalVars } from '../globals/globals'
import { PLAY } from '../globals/uris'
import { DymoNavigator } from '../navigators/navigator'
import { SubsetNavigator } from '../navigators/subsetnav'
import { BoundVariable } from '../model/variable';

/**
 * A rendering defines how a given dymo is played back.
 */
export class Rendering {

	private dymoUri;
	private navigator;

	constructor(dymoUri) {
		this.dymoUri = dymoUri;
	}

	play() {
		if (this.dymoUri) {
			GlobalVars.DYMO_STORE.setParameter(this.dymoUri, PLAY, 1);
		}
	}

	stop() {
		if (this.dymoUri) {
			GlobalVars.DYMO_STORE.setParameter(this.dymoUri, PLAY, 0);
		}
	}

	addSubsetNavigator(boundVar: BoundVariable, nav: SubsetNavigator) {
		if (!this.navigator) {
			this.navigator = new DymoNavigator(this.dymoUri, GlobalVars.DYMO_STORE);//, new SequentialNavigator(dymo));
		}
		this.navigator.addSubsetNavigator(boundVar, nav);
	}

	getNavigator() {
		return this.navigator;
	}

}
