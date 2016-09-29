/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {Object=} defaultSubsetNavigator (optional)
 * @param {Object=} defaultLeafNavigator (optional)
 */
function DymoNavigator(dymo, defaultSubsetNavigator, defaultLeafNavigator) {
	
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
	this.reset = function(dymo) {
		if (dymo) {
			var dymos = dymo.getAllDymosInHierarchy();
			dymos.splice(dymos.indexOf(dymo), 1); //only keep subdymos
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
	
	this.getPosition = function(level, currentDymo) {
		if (!currentDymo) {
			currentDymo = dymo;
		}
		var i = 0;
		var position;
		while (i < level) {
			if (!navigators.has(currentDymo)) {
				return;
			}
			currentDymo = navigators.get(currentDymo).getCurrentParts()[0];
			i++;
		}
		if (navigators.has(currentDymo)) {
			return navigators.get(currentDymo).getPartsNavigated();
		}
	}
	
	//resets all navigators except the current ones and sets the navigator on the given level to the given position
	this.setPosition = function(position, level, currentDymo) {
		if (!currentDymo) {
			currentDymo = dymo;
		}
		//this.reset(currentDymo);
		var i = 0;
		while (i <= level && currentDymo) {
			var currentNav = getNavigator(currentDymo);
			//if level reached, set
			if (i == level) {
				currentNav.setPartsNavigated(position);
				this.reset(currentDymo);
			} else if (currentNav.getCurrentParts()) {
				currentDymo = currentNav.getCurrentParts()[0];
			} else {
				//impossible to set position (navigator out of range)
				currentDymo = undefined;
			}
			i++;
		}
	}
	
	this.getNextParts = function() {
		return recursiveGetNextParts(dymo);
	}
	
	function recursiveGetNextParts(currentDymo) {
		if (currentDymo) {
			var currentNavigator = getNavigator(currentDymo);
			if (currentNavigator) {
				currentNavigators[currentDymo.getLevel()] = currentNavigator;
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
			return [currentDymo];
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
	
	function getNavigator(dymo) {
		if (!navigators.has(dymo)) {
			for (var i = 0, j = subsetNavigators.length; i < j; i++) {
				if (subsetNavigators[i][0](dymo) && dymo.hasParts()) {
					navigators.set(dymo, subsetNavigators[i][1].getCopy(dymo));
				}
			}
			//none of the subsetNavs fit..
			if (!navigators.has(dymo)) {
				if (defaultSubsetNavigator && dymo.hasParts()) {
					navigators.set(dymo, defaultSubsetNavigator.getCopy(dymo));
				} else {
					navigators.set(dymo, defaultLeafNavigator.getCopy(dymo));
				}
			}
		}
		return navigators.get(dymo);
	}
	
}