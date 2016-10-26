/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 * @constructor
 */
function GraphNavigator(dymoUri) {

	var self = this;

	var isPlaying = false;
	var nextPosition = 0;

	this.resetPartsPlayed = function() {
		nextPosition = 0;
	}

	this.getType = function() {
		return GRAPH_NAVIGATOR;
	}

	this.getCopy = function(dymoUri) {
		return new GraphNavigator(dymoUri);
	}

	this.getCurrentParts = function() {
		var parts = DYMO_STORE.findParts(dymoUri);
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
			var options = DYMO_STORE.findSuccessors(parts[0]);
			if (options.length > 0) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return DYMO_STORE.findPartIndex(selectedOption);
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
		var part = DYMO_STORE.findPartAt(dymoUri, nextPosition);
		if (part) {
			/*if (!part.hasParts()) {
				partsNavigated++;
			}*/
			return [part];
		}
	}

}
