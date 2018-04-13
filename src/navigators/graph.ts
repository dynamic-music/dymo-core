import { GRAPH_NAVIGATOR, INDEX_FEATURE } from '../globals/uris'
import { SequentialNavigator } from './sequential'
import { DymoStore } from '../io/dymostore';

/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 */
export class GraphNavigator extends SequentialNavigator {

	constructor(dymoUri, store: DymoStore, getNavigator?: Function) {
		super(dymoUri, store, false, getNavigator);
	}

	getType() {
		return GRAPH_NAVIGATOR;
	}

	getCopy(dymoUri: string, getNavigator: Function) {
		return new GraphNavigator(dymoUri, this.store, getNavigator);
	}

	getNextParts() {
		var nextParts = super.getNextParts();
		this.setPartsNavigated(this.getNextPosition(nextParts[0]));
		return nextParts;
	}

	private getNextPosition(parts) {
		if (parts && parts.length > 0) {
			var options = this.store.findSuccessors(parts[0]);
			if (options.length > 0) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return this.store.findFeatureValue(selectedOption, INDEX_FEATURE);
			}
		}
		return 0;
	}

}
