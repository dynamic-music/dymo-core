/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {Object=} defaultSubsetNavigator (optional)
 */
function DymoNavigator(dymo, defaultSubsetNavigator) {
	
	var subsetNavigators = [];
	var navigators;
	var currentNavigators;
	init();
	
	function init() {
		navigators = new Map();
		currentNavigators = [];
	}
	
	this.reset = function() {
		init();
	}
	
	this.addSubsetNavigator = function(subsetFunction, navigator) {
		subsetNavigators.push([subsetFunction, navigator]);
	}
	
	this.getNextParts = function() {
		return recursiveGetNextParts(dymo);
	}
	
	function recursiveGetNextParts(currentDymo) {
		var currentNavigator = getNavigator(currentDymo);
		if (currentNavigator) {
			currentNavigators[currentDymo.getLevel()] = currentNavigator;
			if (currentNavigator.getType() == ONE_SHOT_NAVIGATOR) {
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
	
	function replaceAndConcat(dymoArray) {
		if (dymoArray && dymoArray.length > 0) {
			//console.log("con", dymoArray.map(function(p){return p.getUri()}))
			var nextLevelArray = [];
			for (var i = 0, j = dymoArray.length; i < j; i++) {
				var nextParts = recursiveGetNextParts(dymoArray[i]);
				//console.log("nex", nextParts)
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
					navigators.set(dymo, new OneShotNavigator(dymo));
				}
			}
		}
		return navigators.get(dymo);
	}
	
}