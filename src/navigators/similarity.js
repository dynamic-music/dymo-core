/**
 * A navigator that follows similarity relations.
 * @constructor
 * @extends {SequentialNavigator}
 * @param {Function=} getNavigator (optional)
 */
function SimilarityNavigator(dymoUri, getNavigator) {

	SequentialNavigator.call(this, dymoUri, false, getNavigator);
	//currently these parameters are global, so identical for each instance
	//DYMO_STORE.addParameter(null, LEAPING_PROBABILITY, 0.5);
	//if true the control continues after the part index leaped to
	//if false it stays on the general timeline and merely replaces parts according to the graph
	//DYMO_STORE.addParameter(null, CONTINUE_AFTER_LEAPING, 0);

	this.getType = function() {
		return SIMILARITY_NAVIGATOR;
	}

	this.getCopy = function(dymoUri, getNavigator) {
		return new SimilarityNavigator(dymoUri, getNavigator);
	}

	this.getNextParts = function() {
		var nextParts = SequentialNavigator.prototype.getNextParts.call(this);
		nextParts[0] = this.replaceWithSimilars(nextParts[0]);
		return nextParts;
	}

	/** @private */
	this.replaceWithSimilars = function(parts) {
		if (parts) {
			if (parts && parts.length > 0) {
				for (var i = 0; i < parts.length; i++) {
					var similars = DYMO_STORE.findSimilars(parts[i]);
					//console.log(parts[i], similars)
					if (similars.length > 0) {
						if (Math.random() < DYMO_STORE.findParameterValue(null, LEAPING_PROBABILITY)) {
							var selectedOption = Math.floor(Math.random()*similars.length);
							if (DYMO_STORE.findParameterValue(null, CONTINUE_AFTER_LEAPING) > 0) {
								var index = DYMO_STORE.findParts(this.dymoUri).indexOf(selectedOption);
								if (index) {
									this.partsNavigated = index+1;
								}
							}
							parts[i] = similars[selectedOption];
						}
					}
				}
			}
			return parts;
		}
	}

}
inheritPrototype(SimilarityNavigator, SequentialNavigator);
