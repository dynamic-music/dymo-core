import { DymoStore } from '../io/dymostore';
import { BoundVariable } from '../model/variable';
import { SubsetNavigator } from './subsetnav'
import { OneShotNavigator } from './oneshot'
import { SequentialNavigator } from './sequential'
import { MORE, DONE } from '../globals/globals'

/**
 * A navigator that follows the order of parts.
 * @constructor
 */
export class DymoNavigator {

	private dymoUri: string;
	private status: string;
	private defaultSubsetNavigator;
	private defaultLeafNavigator;
	private subsetNavigators: Map<BoundVariable,SubsetNavigator> = new Map<BoundVariable,SubsetNavigator>();
	private navigator: SubsetNavigator;

	constructor(dymoUri, private store: DymoStore, defaultSubsetNavigator?: Object, defaultLeafNavigator?: Object) {
		this.dymoUri = dymoUri;
		this.defaultSubsetNavigator = defaultSubsetNavigator;
		this.defaultLeafNavigator = defaultLeafNavigator;
		this.init();
	}

	init() {
		this.navigator = null;
		/*if (!defaultSubsetNavigator) {
			defaultSubsetNavigator = new SequentialNavigator(undefined);
		}*/
	}

	//resets all subnavigators associated with the given dymo
	reset(dymoUri?) {
		/*if (dymoUri) {
			var dymos = DYMO_STORE.findAllObjectsInHierarchy(dymoUri);
			dymos.splice(dymos.indexOf(dymoUri), 1); //only keep subdymos
			for (var i = 0, ii = dymos.length; i < ii; i++) {
				var nav = navigators.delete(dymos[i]);
				var index = currentNavigators.indexOf(nav);
				if (index) {
					currentNavigators.splice(index, 1);
				}
			}
		} else {*/
			this.init();
		//}
	}

	addSubsetNavigator(subset: BoundVariable, navigator: SubsetNavigator) {
		this.subsetNavigators.set(subset, navigator);
	}

	getSubsetNavigators(): Map<BoundVariable,SubsetNavigator> {
		return this.subsetNavigators;
	}

	getPosition(currentDymoUri: string): number {
		if (!currentDymoUri) {
			currentDymoUri = this.dymoUri;
		}
		var i = 0;
		var position;
		var subsetNav = this.navigator;
		if (subsetNav instanceof SequentialNavigator) {
			return subsetNav.getPartsNavigated();
		}

		//TODO: POSITION USED TO BE HIERARCHICAL(LIST OF POSITIONS...)
		/*while (i < level) {
			if (!navigators.has(currentDymoUri)) {
				return;
			}
			currentDymoUri = navigators.get(currentDymoUri).getCurrentParts()[0];
			i++;
		}
		var nav = navigators.get(currentDymoUri);
		if (nav && nav.getPartsNavigated) {
			return navigators.get(currentDymoUri).getPartsNavigated();
		}*/
	}

	//resets all navigators except the current ones and sets the navigator on the given level to the given position
	setPosition(position, level, currentDymoUri) {
		if (!currentDymoUri) {
			currentDymoUri = this.dymoUri;
		}
		//this.reset(currentDymo);
		var i = 0;
		while (i <= level && currentDymoUri) {
			var currentNav = this.getNavigator(currentDymoUri);
			//if level reached, set
			if (i == level && currentNav instanceof SequentialNavigator) {
				currentNav.setPartsNavigated(position);
				this.reset(currentDymoUri);
			}/* else if (currentNav.getCurrentParts()) {
				currentDymoUri = currentNav.getCurrentParts()[0];
			}*/ else {
				//impossible to set position (navigator out of range)
				currentDymoUri = undefined;
			}
			i++;
		}
	}

	getNextParts() {
		if (!this.navigator) {
			this.navigator = this.getNavigator(this.dymoUri);
		}
		if (this.status !== DONE) {
			let nextParts = this.navigator.getNextParts();
			this.status = nextParts[1];
			return nextParts[0];
		}
	}

	/*function recursiveGetNextParts(currentDymoUri) {
		if (path.length > 0) {
			var currentNavigator = getNavigator(currentDymoUri);
			if (currentNavigator) {
				currentNavigators[DYMO_STORE.findLevel(currentDymoUri)] = currentNavigator;
				var nextParts;
				if (currentNavigator.getType() == ONE_SHOT_NAVIGATOR || currentNavigator.getType() == REPEATED_NAVIGATOR) {
					nextParts = currentNavigator.getCurrentParts(path);
				} else {
					nextParts = replaceAndConcat(path, currentNavigator.getCurrentParts(path));
					if (!nextParts) {
						nextParts = replaceAndConcat(path, currentNavigator.getNextParts(path));
					}
					console.log(currentDymoUri, nextParts)
				}
				return nextParts;
			}
			return [currentDymoUri];
		}
	}

	function replaceAndConcat(path, dymoArray) {
		if (dymoArray && dymoArray.length > 0) {
			var nextLevelArray = [];
			for (var i = 0, j = dymoArray.length; i < j; i++) {
				var nextParts = recursiveGetNextParts(path.concat(dymoArray[i]));
				if (nextParts) {
					if (nextParts.length) {
						nextLevelArray = nextLevelArray.concat(nextParts);
					} else {
						nextLevelArray.push(nextParts);
					}
				}
			}
			if (nextLevelArray.length > 0) {
				return nextLevelArray;
			}
		}
	}*/

	private getNavigator(dymoUri: string): SubsetNavigator {
		for (var subset of this.subsetNavigators.keys()) {
			if (subset.getValues(this.store).indexOf(dymoUri) >= 0) {
				return this.subsetNavigators.get(subset).getCopy(dymoUri, this.getNavigator.bind(this));
			}
		}
		if (dymoUri && this.defaultSubsetNavigator) { //&& DYMO_STORE.findParts(dymoUri).length > 0) {
			return this.defaultSubsetNavigator.getCopy(dymoUri, this.getNavigator.bind(this));
		} else {
			return new OneShotNavigator(dymoUri);
		}
	}

}
