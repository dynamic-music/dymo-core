/**
 * A navigator that follows similarity relations.
 * @constructor
 */
function SimilarityNavigator(dymoUri) {

	var self = this;

	var isPlaying = false;
	var partsNavigated = 0;

	//currently these parameters are global, so identical for each instance
	//DYMO_STORE.addParameter(null, LEAPING_PROBABILITY, 0.5);
	//if true the control continues after the part index leaped to
	//if false it stays on the general timeline and merely replaces parts according to the graph
	//DYMO_STORE.addParameter(null, CONTINUE_AFTER_LEAPING, 0);

	this.resetPartsPlayed = function() {
		partsNavigated = 0;
	}

	this.getType = function() {
		return SIMILARITY_NAVIGATOR;
	}

	this.getCopy = function(dymoUri) {
		return new SimilarityNavigator(dymoUri);
	}

	this.getCurrentParts = function() {
		if (DYMO_STORE.findParts(dymoUri).length > 0) {
			if (DYMO_STORE.findObject(dymoUri, CDT) == CONJUNCTION) {
				return replaceWithSimilars(getParallelParts());
			}
			return replaceWithSimilars(getSequentialPart()); //SEQUENTIAL FOR EVERYTHING ELSE
		}
	}

	this.getNextParts = function() {
		partsNavigated++;
		return this.getCurrentParts();
	}

	function replaceWithSimilars(parts) {
		if (parts) {
			if (parts && parts.length > 0) {
				for (var i = 0; i < parts.length; i++) {
					var similars = DYMO_STORE.findSimilars(parts[i]);
					if (similars.length > 0) {
						if (Math.random() < DYMO_STORE.findParameterValue(null, LEAPING_PROBABILITY)) {
							var selectedOption = Math.floor(Math.random()*similars.length);
							if (DYMO_STORE.findParameterValue(null, CONTINUE_AFTER_LEAPING) > 0) {
								var index = DYMO_STORE.findParts(dymoUri).indexOf(selectedOption);
								if (index) {
									partsNavigated = index+1;
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

	function getParallelParts() {
		if (partsNavigated <= 0) {
			partsNavigated++;
			return DYMO_STORE.findParts(dymoUri);
		}
	}

	function getSequentialPart() {
		var partUri = DYMO_STORE.findPartAt(dymoUri, partsNavigated);
		if (partUri) {
			if (DYMO_STORE.findParts(partUri).length == 0) {
				partsNavigated++;
			}
			return [partUri];
		}
	}

}
