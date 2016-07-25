/**
 * A navigator that follows similarity relations.
 * @constructor
 */
function SimilarityNavigator(dymo) {
	
	var self = this;
	
	var isPlaying = false;
	var partsNavigated = 0;
	
	this.leapingProbability = new Parameter(LEAPING_PROBABILITY, 0.5);
	//if true the control continues after the part index leaped to
	//if false it stays on the general timeline and merely replaces parts according to the graph
	this.continueAfterLeaping = new Parameter(CONTINUE_AFTER_LEAPING, 0, true);
	
	this.resetPartsPlayed = function() {
		partsNavigated = 0;
	}
	
	this.getType = function() {
		return SIMILARITY_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		var copy = new SimilarityNavigator(dymo);
		copy.leapingProbability.update(this.leapingProbability.getValue(), this);
		copy.continueAfterLeaping.update(this.continueAfterLeaping.getValue(), this);
		return copy;
	}
	
	this.getCurrentParts = function() {
		var parts = dymo.getParts();
		if (parts.length > 0) {
			if (dymo.getType() == CONJUNCTION) {
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
		if (parts && parts.length > 0) {
			for (var i = 0; i < parts.length; i++) {
				if (parts[i].getSimilars().length > 0) {
					if (Math.random() < self.leapingProbability.getValue()) {
						var options = parts[i].getSimilars();
						var selectedOption = Math.floor(Math.random()*options.length);
						if (self.continueAfterLeaping.getValue()) {
							var index = dymo.getParts().indexOf(selectedOption);
							if (index) {
								partsNavigated = index+1;
							}
						}
						parts[i] = options[selectedOption];
					}
				}
			}
		}
		return parts;
	}
	
	function getParallelParts() {
		if (partsNavigated <= 0) {
			partsNavigated++;
			return dymo.getParts();
		}
	}
	
	function getSequentialPart() {
		var part = dymo.getPart(partsNavigated);
		if (part) {
			if (!part.hasParts()) {
				partsNavigated++;
			}
			return [part];
		}
	}
	
}