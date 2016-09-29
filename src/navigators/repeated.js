/**
 * A navigator that remembers whether its dymo was already requested or not (for artificial leaf nodes)
 * @constructor
 */
function RepeatedNavigator(dymo) {
	
	this.getType = function() {
		return REPEATED_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		return new RepeatedNavigator(dymo);
	}
	
	this.getCurrentParts = function() {
		return [dymo];
	}
	
	this.getNextParts = function() {
		return this.getCurrentParts();
	}
	
}