/**
 * A navigator that remembers whether its dymo was already requested or not (for artificial leaf nodes)
 * @constructor
 */
function OneShotNavigator(dymo) {
	
	var navigated = false;
	
	this.getType = function() {
		return ONE_SHOT_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		return new OneShotNavigator(dymo);
	}
	
	this.getCurrentParts = function() {
		if (!navigated) {
			navigated = true;
			return [dymo];
		}
	}
	
	this.getNextParts = function() {
		return this.getCurrentParts();
	}
	
}