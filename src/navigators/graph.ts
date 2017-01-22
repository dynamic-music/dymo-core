import { GlobalVars } from '../globals/globals'
import { GRAPH_NAVIGATOR } from '../globals/uris'
import { SequentialNavigator } from './sequential'

/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 */
export class GraphNavigator extends SequentialNavigator {

	constructor(dymoUri, getNavigator?: Function) {
		super(dymoUri, false, getNavigator);
	}

	getType() {
		return GRAPH_NAVIGATOR;
	}

	getCopy(dymoUri, getNavigator) {
		return new GraphNavigator(dymoUri, getNavigator);
	}

	getNextParts() {
		var nextParts = SequentialNavigator.prototype.getNextParts.call(this);
		this.partsNavigated = this.getNextPosition(nextParts[0]);
		return nextParts;
	}

	private getNextPosition(parts) {
		if (parts && parts.length > 0) {
			var options = GlobalVars.DYMO_STORE.findSuccessors(parts[0]);
			if (options.length > 0) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return GlobalVars.DYMO_STORE.findPartIndex(selectedOption);
			}
		}
	}

}
