/**
 * A navigator that remembers whether its dymo was already requested or not (for artificial leaf nodes)
 * @constructor
 */
function OneShotNavigator(dymoUri) {

	this.getNextParts = function() {
		return [[dymoUri], DONE];
	}

}
