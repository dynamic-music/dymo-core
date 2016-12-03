/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {Object=} defaultSubsetNavigator (optional)
 * @param {Object=} defaultLeafNavigator (optional)
 */
function DymoNavigator(dymoUri, defaultSubsetNavigator, defaultLeafNavigator) {

	var subsetNavigators = [];
	var navigator;
	init();

	function init() {
		navigator = null;
		/*if (!defaultSubsetNavigator) {
			defaultSubsetNavigator = new SequentialNavigator(undefined);
		}*/
	}

	//resets all subnavigators associated with the given dymo
	this.reset = function(dymoUri) {
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
			init();
		//}
	}

	this.addSubsetNavigator = function(subsetFunction, navigator) {
		subsetNavigators.push([subsetFunction, navigator]);
	}

	this.getSubsetNavigators = function() {
		return subsetNavigators;
	}

	this.getPosition = function(level, currentDymoUri) {
		if (!currentDymoUri) {
			currentDymoUri = dymoUri;
		}
		var i = 0;
		var position;
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
	this.setPosition = function(position, level, currentDymoUri) {
		if (!currentDymoUri) {
			currentDymoUri = dymoUri;
		}
		//this.reset(currentDymo);
		var i = 0;
		while (i <= level && currentDymoUri) {
			var currentNav = getNavigator(currentDymoUri);
			//if level reached, set
			if (i == level && currentNav.setPartsNavigated) {
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

	this.getNextParts = function() {
		if (!navigator) {
			navigator = getNavigator(dymoUri);
		}
		return navigator.getNextParts()[0];
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

	function getNavigator(dymoUri) {
		for (var i = 0, j = subsetNavigators.length; i < j; i++) {
			if (subsetNavigators[i][0].applyDirect(null, null, dymoUri)) {
				return subsetNavigators[i][1].getCopy(dymoUri, getNavigator);
			}
		}
		if (dymoUri && defaultSubsetNavigator) { //&& DYMO_STORE.findParts(dymoUri).length > 0) {
			return defaultSubsetNavigator.getCopy(dymoUri, getNavigator);
		} else {
			return new OneShotNavigator(dymoUri);
		}
	}

}
