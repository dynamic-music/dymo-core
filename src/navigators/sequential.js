/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {boolean=} backwards (optional)
 */
function SequentialNavigator(dymoUri, backwards) {

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

	this.getCopy = function(dymoUri) {
		return new SequentialNavigator(dymoUri, backwards);
	}

	this.getDymo = function() {
		return dymoUri;
	}

	this.getCurrentParts = function() {
		var parts = DYMO_STORE.findParts(dymoUri);
		if (parts.length > 0) {
			if (DYMO_STORE.findObject(dymoUri, CDT) == CONJUNCTION) {
				return partsNavigated<=0? DYMO_STORE.findParts(dymoUri): null;
			}
			return getSequentialPart(); //SEQUENTIAL FOR EVERYTHING ELSE
		}
	}

	this.getNextParts = function() {
		partsNavigated++;
		return this.getCurrentParts();
	}

	function getSequentialPart() {
		var part;
		var parts = DYMO_STORE.findParts(dymoUri);
		if (backwards) {
			part = parts[parts.length-partsNavigated];
		} else {
			part = parts[partsNavigated];
		}
		if (part) {
			/*if (!part.hasParts()) {
				partsNavigated++;
			}*/
			return [part];
		}
	}

}
