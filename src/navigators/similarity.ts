import { GlobalVars } from '../globals/globals'
import * as uris from '../globals/uris'
import { SequentialNavigator } from './sequential'

/**
 * A navigator that follows similarity relations.
 */
export class SimilarityNavigator extends SequentialNavigator {

	constructor(dymoUri, getNavigator?: Function) {
		super(dymoUri, false, getNavigator);
		//currently these parameters are global, so identical for each instance
		//Globals.DYMO_STORE.addParameter(null, LEAPING_PROBABILITY, 0.5);
		//if true the control continues after the part index leaped to
		//if false it stays on the general timeline and merely replaces parts according to the graph
		//Globals.DYMO_STORE.addParameter(null, CONTINUE_AFTER_LEAPING, 0);
	}

	getType() {
		return uris.SIMILARITY_NAVIGATOR;
	}

	getCopy(dymoUri, getNavigator) {
		return new SimilarityNavigator(dymoUri, getNavigator);
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
					var similars = GlobalVars.DYMO_STORE.findSimilars(parts[i]);
					//console.log(parts[i], similars)
					if (similars.length > 0) {
						if (Math.random() < GlobalVars.DYMO_STORE.findParameterValue(null, uris.LEAPING_PROBABILITY)) {
							var selectedOption = similars[Math.floor(Math.random()*similars.length)];
							if (GlobalVars.DYMO_STORE.findParameterValue(null, uris.CONTINUE_AFTER_LEAPING) > 0) {
								var index = GlobalVars.DYMO_STORE.findParts(this.dymoUri).indexOf(selectedOption);
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
