import { DymoStore } from '../io/dymostore'
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

	constructor(dymoUri: string, private store: DymoStore) {
		this.dymoUri = dymoUri;
	}

	play() {
		if (this.dymoUri) {
			this.store.setParameter(this.dymoUri, PLAY, 1);
		}
	}

	stop() {
		if (this.dymoUri) {
			this.store.setParameter(this.dymoUri, PLAY, 0);
		}
	}

	addSubsetNavigator(boundVar: BoundVariable, nav: SubsetNavigator) {
		if (!this.navigator) {
			this.navigator = new DymoNavigator(this.dymoUri, this.store);//, new SequentialNavigator(dymo));
		}
		this.navigator.addSubsetNavigator(boundVar, nav);
	}

	getNavigator() {
		return this.navigator;
	}

}
