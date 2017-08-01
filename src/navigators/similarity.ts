import * as uris from '../globals/uris';
import { SequentialNavigator } from './sequential';
import { DymoStore } from '../io/dymostore';

/**
 * A navigator that follows similarity relations.
 */
export class SimilarityNavigator extends SequentialNavigator {

	constructor(dymoUri, store: DymoStore, getNavigator?: Function) {
		super(dymoUri, store, false, getNavigator);
		//currently these parameters are global, so identical for each instance
		//Globals.DYMO_STORE.setControlParam(null, LEAPING_PROBABILITY, 0.5);
		//if true the control continues after the part index leaped to
		//if false it stays on the general timeline and merely replaces parts according to the graph
		//Globals.DYMO_STORE.setControlParam(null, CONTINUE_AFTER_LEAPING, 0);
	}

	getType() {
		return uris.SIMILARITY_NAVIGATOR;
	}

	getCopy(dymoUri: string, getNavigator: Function) {
		return new SimilarityNavigator(dymoUri, this.store, getNavigator);
	}

	getNextParts() {
		var nextParts = SequentialNavigator.prototype.getNextParts.call(this);
		nextParts[0] = this.replaceWithSimilars(nextParts[0]);
		return nextParts;
	}

	private replaceWithSimilars(parts) {
		if (parts) {
			if (parts && parts.length > 0) {
				for (var i = 0; i < parts.length; i++) {
					var similars = this.store.findSimilars(parts[i]);
					//console.log(parts[i], similars)
					if (similars.length > 0) {
						if (Math.random() < this.store.findControlParamValue(null, uris.LEAPING_PROBABILITY)) {
							var selectedOption = similars[Math.floor(Math.random()*similars.length)];
							if (this.store.findControlParamValue(null, uris.CONTINUE_AFTER_LEAPING) > 0) {
								var index = this.store.findParts(this.dymoUri).indexOf(selectedOption);
								if (index) {
									this.partsNavigated = index+1;
								}
							}
							parts[i] = selectedOption;
						}
					}
				}
			}
			return parts;
		}
	}

}
