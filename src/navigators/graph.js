/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 * @constructor
 */
function GraphNavigator(dymo) {
	
	var self = this;
	
	var isPlaying = false;
	var nextPosition = 0;
	
	this.resetPartsPlayed = function() {
		nextPosition = 0;
	}
	
	this.getType = function() {
		return GRAPH_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		return new GraphNavigator(dymo);
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
			var options = parts[0].getSuccessors();
			if (options.length > 0) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return dymo.getParts().indexOf(selectedOption);
			}
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