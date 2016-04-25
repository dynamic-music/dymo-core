/**
 * A parameter that has updaters and observers.
 * @param {boolean=} isInteger (optional)
 * @constructor
 */
function Parameter(name, initialValue, isInteger) {
	/** @private */
	this.name = name;
	/** @private */
	this.value = initialValue;
	/** @private */
	this.change = 0; //records amount of last change
	/** @private */
	this.isInteger = isInteger;
	/** @private */
	this.updaters = [];
	/** @private */
	this.observers = [];
}

Parameter.prototype.getName = function() {
	return this.name;
}

Parameter.prototype.getValue = function() {
	return this.value;
}

Parameter.prototype.getChange = function() {
	return this.change;
}

Parameter.prototype.addUpdater = function(updater) {
	if (this.updaters.indexOf(updater) < 0) {
		this.updaters.push(updater);
		updater.updatedParameterChanged(this.value);
	}
}

Parameter.prototype.removeUpdater = function(updater) {
	var i = this.updaters.indexOf(updater);
	if (i > -1) {
		this.updaters.splice(i, 1);
	}
}

Parameter.prototype.addObserver = function(observer) {
	this.observers.push(observer);
}

Parameter.prototype.removeObserver = function(observer) {
	var i = this.observers.indexOf(observer);
	if (i > -1) {
		this.observers.splice(i, 1);
	}
}

Parameter.prototype.getObservers = function() {
	return this.observers;
}

Parameter.prototype.update = function(newValue, updater) {
	this.setValueAndNotify(updater, newValue);
}

Parameter.prototype.relativeUpdate = function(newChange, updater) {
	this.update(this.value+newChange, updater);
}

//returns the first value that it manages to request that is different from this.value
//returns this.value if none are different
Parameter.prototype.requestValue = function() {
	for (var i = 0; i < this.updaters.length; i++) {
		var requestedValue = this.updaters[i].requestValue();
		if (requestedValue && requestedValue != this.value) {
			this.setValueAndNotify(this.updaters[i], requestedValue);
			return this.value;
		}
	}
	return this.value;
}

/** @private */
Parameter.prototype.notifyObservers = function() {
	for (var i = 0; i < this.observers.length; i++) {
		this.observers[i].observedParameterChanged(this);
	}
}

/** @private */
Parameter.prototype.setValueAndNotify = function(updater, newValue) {
	if (!isNaN(newValue)) {
		if (this.isInteger) {
			newValue = Math.round(newValue);
		}
		if (isNaN(this.value) || Math.abs(newValue - this.value) > 0.000001) { //catch floating point errors
			this.change = newValue - this.value;
			this.value = newValue;
			//update values of all other updaters connected to this parameter
			for (var i = 0; i < this.updaters.length; i++) {
				if (this.updaters[i] != updater) {
					this.updaters[i].updatedParameterChanged(this.value);
				}
			}
			//only notify if value changed
			if (this.change) {
				this.notifyObservers();
			}
		}
	}
}