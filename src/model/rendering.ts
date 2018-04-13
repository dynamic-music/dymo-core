import { DymoStore } from '../io/dymostore-service'
import { PLAY } from '../globals/uris'
import { DymoNavigator } from '../navigators/navigator'
import { SubsetNavigator } from '../navigators/subsetnav'
import { SequentialNavigator } from '../navigators/sequential'
import { BoundVariable } from '../model/variable';

/**
 * A rendering defines how a given dymo is played back.
 */
export class Rendering {

	private dymoUri;
	private navigator: DymoNavigator;

	constructor(dymoUri: string, private store: DymoStore) {
		this.dymoUri = dymoUri;
		//this.navigator = new DymoNavigator(this.dymoUri, this.store, new SequentialNavigator(this.dymoUri, this.store));
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
		this.navigator.addSubsetNavigator(boundVar, nav);
	}

	getNavigator(): DymoNavigator {
		return this.navigator;
	}

}
