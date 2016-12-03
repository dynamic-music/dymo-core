/**
 * A navigator that probabilistically jumps along directed edges, or moves sequentially if there are none.
 * @constructor
 * @extends {SequentialNavigator}
 * @param {Function=} getNavigator (optional)
 */
function GraphNavigator(dymoUri, getNavigator) {

	SequentialNavigator.call(this, dymoUri, false, getNavigator);

	this.getType = function() {
		return GRAPH_NAVIGATOR;
	}

	this.getCopy = function(dymoUri, getNavigator) {
		return new GraphNavigator(dymoUri, getNavigator);
	}

	this.getNextParts = function() {
		var nextParts = SequentialNavigator.prototype.getNextParts.call(this);
		this.partsNavigated = this.getNextPosition(nextParts[0]);
		return nextParts;
	}

	/** @private */
	this.getNextPosition = function(parts) {
		if (parts && parts.length > 0) {
			var options = DYMO_STORE.findSuccessors(parts[0]);
			if (options.length > 0) {
				var selectedOption = options[Math.floor(Math.random()*options.length)];
				return DYMO_STORE.findPartIndex(selectedOption);
			}
		}
	}

}
inheritPrototype(GraphNavigator, SequentialNavigator);
