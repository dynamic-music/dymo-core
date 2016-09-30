/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 * @constructor
 */
function GraphNavigator(dymo) {
	
	var self = this;
	
	var isPlaying = false;
	var nextPosition = 0;
	
	this.leapingProbability = new Parameter(LEAPING_PROBABILITY, 0.8);
	//if true the control continues after the part index leaped to
	//if false it stays on the general timeline and merely replaces parts according to the graph
	
	this.resetPartsPlayed = function() {
		nextPosition = 0;
	}
	
	this.getType = function() {
		return GRAPH_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		var copy = new GraphNavigator(dymo);
		copy.leapingProbability.update(this.leapingProbability.getValue(), this);
		//copy.continueAfterLeaping.update(this.continueAfterLeaping.getValue(), this);
		return copy;
	}
	
	this.getCurrentParts = function() {
		var parts = dymo.getParts();
		if (parts.length > 0) {
			/*if (dymo.getType() == CONJUNCTION) {
				return replaceWithSimilars(getParallelParts());
			}*/
			var currentPart = getSequentialPart();
			nextPosition = getNextPosition(currentPart);
			return currentPart; //SEQUENTIAL FOR EVERYTHING ELSE
		}
	}
	
	this.getNextParts = function() {
		//partsNavigated++;
		return this.getCurrentParts();
	}
	
	function getNextPosition(parts) {
		if (parts && parts.length > 0) {
			//console.log("be", parts.map(function(o){return o.getUri();}), partsNavigated)
			var options = parts[0].getSimilars();
			if (options.length > 0 && Math.random() < self.leapingProbability.getValue()) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return dymo.getParts().indexOf(selectedOption);
			}
			return nextPosition+1;
		}
	}
	
	function getParallelParts() {
		/*if (partsNavigated <= 0) {
			partsNavigated++;
			return dymo.getParts();
		}*/
	}
	
	function getSequentialPart() {
		var part = dymo.getPart(nextPosition);
		if (part) {
			/*if (!part.hasParts()) {
				partsNavigated++;
			}*/
			return [part];
		}
	}
	
}