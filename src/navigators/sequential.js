/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {boolean=} backwards (optional)
 */
function SequentialNavigator(dymo, backwards) {
	
	var partsNavigated = 0;
	
	this.resetPartsNavigated = function() {
		partsNavigated = 0;
	}
	
	this.setPartsNavigated = function(played) {
		partsNavigated = played;
	}
	
	this.getPartsNavigated = function() {
		return partsNavigated;
	}
	
	this.getType = function() {
		return SEQUENTIAL_NAVIGATOR;
	}
	
	this.getCopy = function(dymo) {
		return new SequentialNavigator(dymo, backwards);
	}
	
	this.getDymo = function() {
		return dymo;
	}
	
	this.getCurrentParts = function() {
		var parts = dymo.getParts();
		if (parts.length > 0) {
			if (dymo.getType() == PARALLEL) {
				return getParallelParts();
			}
			return getSequentialPart(); //SEQUENTIAL FOR EVERYTHING ELSE
		}
	}
	
	this.getNextParts = function() {
		partsNavigated++;
		return this.getCurrentParts();
	}
	
	function getParallelParts() {
		if (partsNavigated <= 0) {
			return dymo.getParts();
		}
	}
	
	function getSequentialPart() {
		var part;
		if (backwards) {
			var partCount = dymo.getParts().length;
			part = dymo.getPart(partCount-partsNavigated);
		} else {
			part = dymo.getPart(partsNavigated);
		}
		if (part) {
			/*if (!part.hasParts()) {
				partsNavigated++;
			}*/
			return [part];
		}
	}
	
}