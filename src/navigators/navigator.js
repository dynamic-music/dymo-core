/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {Object=} defaultSubsetNavigator (optional)
 * @param {Object=} defaultLeafNavigator (optional)
 */
function DymoNavigator(dymoUri, defaultSubsetNavigator, defaultLeafNavigator) {

	var subsetNavigators = [];
	var navigators;
	var currentNavigators;
	init();

	function init() {
		navigators = new Map();
		currentNavigators = [];
		/*if (!defaultSubsetNavigator) {
			defaultSubsetNavigator = new SequentialNavigator(undefined);
		}*/
		if (!defaultLeafNavigator) {
			defaultLeafNavigator = new OneShotNavigator(undefined);
		}
	}

	//resets all subnavigators associated with the given dymo
	this.reset = function(dymoUri) {
		if (dymoUri) {
			var dymos = DYMO_STORE.findAllObjectsInHierarchy(dymoUri);
			dymos.splice(dymos.indexOf(dymoUri), 1); //only keep subdymos
			for (var i = 0, ii = dymos.length; i < ii; i++) {
				var nav = navigators.delete(dymos[i]);
				var index = currentNavigators.indexOf(nav);
				if (index) {
					currentNavigators.splice(index, 1);
				}
			}
		} else {
			init();
		}
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
		while (i < level) {
			if (!navigators.has(currentDymoUri)) {
				return;
			}
			currentDymoUri = navigators.get(currentDymoUri).getCurrentParts()[0];
			i++;
		}
		var nav = navigators.get(currentDymoUri);
		if (nav && nav.getPartsNavigated) {
			return navigators.get(currentDymoUri).getPartsNavigated();
		}
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
			} else if (currentNav.getCurrentParts()) {
				currentDymoUri = currentNav.getCurrentParts()[0];
			} else {
				//impossible to set position (navigator out of range)
				currentDymoUri = undefined;
			}
			i++;
		}
	}

	this.getNextParts = function() {
		return recursiveGetNextParts(dymoUri);
	}

	function recursiveGetNextParts(currentDymoUri) {
		if (currentDymoUri) {
			var currentNavigator = getNavigator(currentDymoUri);
			if (currentNavigator) {
				currentNavigators[DYMO_STORE.findLevel(currentDymoUri)] = currentNavigator;
				if (currentNavigator.getType() == ONE_SHOT_NAVIGATOR || currentNavigator.getType() == REPEATED_NAVIGATOR) {
					return currentNavigator.getCurrentParts();
				}
				var par = currentNavigator.getCurrentParts();
				var nextParts = replaceAndConcat(par);
				if (nextParts) {
					return nextParts;
				} else {
					return replaceAndConcat(currentNavigator.getNextParts());
				}
			}
			return [currentDymoUri];
		}
	}

	function replaceAndConcat(dymoArray) {
		if (dymoArray && dymoArray.length > 0) {
			var nextLevelArray = [];
			for (var i = 0, j = dymoArray.length; i < j; i++) {
				var nextParts = recursiveGetNextParts(dymoArray[i]);
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
	}

	function getNavigator(dymoUri) {
		if (!navigators.has(dymoUri)) {
			for (var i = 0, j = subsetNavigators.length; i < j; i++) {
				if (subsetNavigators[i][0].applyDirect(dymoUri)) {
					navigators.set(dymoUri, subsetNavigators[i][1].getCopy(dymoUri));
				}
			}
			//none of the subsetNavs fit..
			if (!navigators.has(dymoUri)) {
				//console.log(dymoUri, defaultSubsetNavigator, DYMO_STORE.findParts(dymoUri))
				if (defaultSubsetNavigator && DYMO_STORE.findParts(dymoUri).length > 0) {
					navigators.set(dymoUri, defaultSubsetNavigator.getCopy(dymoUri));
				} else {
					navigators.set(dymoUri, defaultLeafNavigator.getCopy(dymoUri));
				}
			}
		}
		return navigators.get(dymoUri);
	}

}
