/**
 * A navigator that remembers whether its dymo was already requested or not (for artificial leaf nodes)
 * @constructor
 */
function OneShotNavigator(dymoUri) {

	var navigated = false;

	this.getType = function() {
		return ONE_SHOT_NAVIGATOR;
	}

	this.getCopy = function(dymoUri) {
		return new OneShotNavigator(dymoUri);
	}

	this.getCurrentParts = function() {
		if (!navigated) {
			//only done navigating if not looping
			var loopParam = DYMO_STORE.findParameterValue(dymoUri, LOOP);
			if (!loopParam || loopParam != 1) {
				navigated = true;
			}
			return [dymoUri];
		}
	}

	this.getNextParts = function() {
		return this.getCurrentParts();
	}

}
