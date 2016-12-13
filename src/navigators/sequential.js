/**
 * A navigator that follows the order of parts.
 * @constructor
 * @param {boolean=} backwards (optional)
 * @param {Function=} getNavigator (optional)
 */
function SequentialNavigator(dymoUri, backwards, getNavigator) {
	this.dymoUri = dymoUri;
	this.parts = DYMO_STORE.findParts(dymoUri);
	this.dymoType = DYMO_STORE.findObject(this.dymoUri, CDT);
	/** @private */
	this.backwards = backwards;
	this.getNavigator = getNavigator;
	/** @protected */
	this.partsNavigated = 0;
	this.currentSubNavs = null;
}

SequentialNavigator.prototype.resetPartsNavigated = function() {
	this.partsNavigated = 0;
	this.currentSubNavs = null;
}

SequentialNavigator.prototype.setPartsNavigated = function(partsNavigated) {
	this.partsNavigated = partsNavigated;
}

SequentialNavigator.prototype.getPartsNavigated = function() {
	return this.partsNavigated;
}

SequentialNavigator.prototype.getType = function() {
	return SEQUENTIAL_NAVIGATOR;
}

SequentialNavigator.prototype.getCopy = function(dymoUri, getNavigator) {
	return new SequentialNavigator(dymoUri, this.backwards, getNavigator);
}

SequentialNavigator.prototype.getDymo = function() {
	return this.dymoUri;
}

SequentialNavigator.prototype.getNextParts = function() {
	if (this.dymoType == CONJUNCTION) {
		if (!this.currentSubNavs) {
			this.currentSubNavs = this.parts.map(p=>this.getNavigator(p));
			this.doneSubNavs = new Set();
		}
		var nextParts = this.currentSubNavs.map(n=>n.getNextParts());
		var statuses = nextParts.map(p=>p[1]);
		//keep track of subnavs that have finished once
		this.currentSubNavs.filter((n,i)=>statuses[i]!=MORE).forEach(n=>this.doneSubNavs.add(n));
		nextParts = flattenArray(nextParts.map(p=>p[0]));
		//console.log(this.dymoUri);
		if (this.doneSubNavs.size < this.currentSubNavs.length) {
			//say that there's still more
			return [nextParts, MORE];
		}
		return [nextParts, DONE];
	} else if (this.dymoType == DISJUNCTION) {
		if (!this.currentSubNavs) {
			this.currentSubNavs = this.getRandomSubNav();
		}
		var nextParts = this.currentSubNavs.getNextParts();
		if (nextParts[1] != MORE) {
			this.resetPartsNavigated();
		}
		//console.log(this.dymoUri);
		return nextParts;
	} else if (this.parts.length > 0) {
		if (!this.currentSubNavs) {
			this.currentSubNavs = this.getNextSubNav();
		}
		//console.log(this.dymoUri, this.parts, this.partsNavigated, this.currentSubNavs);
		var nextParts = this.currentSubNavs.getNextParts();
		if (nextParts[1] != MORE) {
			this.partsNavigated++;
			if (this.partsNavigated < this.parts.length) {
				nextParts[1] = MORE;
				this.currentSubNavs = this.getNextSubNav();
			} else {
				nextParts[1] = DONE;
				this.resetPartsNavigated();
			}
		}
		//console.log(this.dymoUri, nextParts[0]);
		return nextParts;
	} else {
		return [[this.dymoUri], DONE];
	}
}

/** @private */
SequentialNavigator.prototype.getRandomSubNav = function() {
	var part = this.parts[Math.floor(Math.random()*this.parts.length)];
	return this.getNavigator(part);
}

/** @private */
SequentialNavigator.prototype.getNextSubNav = function() {
	var part;
	if (this.backwards) {
		part = this.parts[this.parts.length-1-this.partsNavigated];
	} else {
		part = this.parts[this.partsNavigated];
	}
	if (part) {
		return this.getNavigator(part);
	}
}
