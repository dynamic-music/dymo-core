/**
 * A control actively changes its value.
 * @constructor
 */
function Control(uri, name, type) {

	/** @private */
	this.uri = uri;
	/** @private */
	this.name = name;
	/** @private */
	this.type = type;
	/** @private */
	this.value;
	/** @private */
	this.observers = [];
	/** @private */
	this.updateFunction;

}

Control.prototype.getName = function() {
	return this.name;
}

Control.prototype.getUri = function() {
	return this.uri;
}

Control.prototype.getValue = function() {
	return this.value;
}

Control.prototype.getType = function() {
	return this.type;
}

Control.prototype.setUpdateFunction = function(func) {
	this.updateFunction = func;
}

Control.prototype.addObserver = function(observer) {
	this.observers.push(observer);
	//observer.observedControlChanged(this.value, this);
}

Control.prototype.removeObserver = function(observer) {
	var i = this.observers.indexOf(observer);
	if (i > -1) {
		this.observers.splice(i, 1);
	}
}

Control.prototype.backpropagate = function(newValue, observer) {
	if (isFinite(newValue)) {
		this.setValue(newValue, observer);
		if (this.updateFunction) {
			this.updateFunction(this.value);
		}
	}
}

Control.prototype.update = function(newValue) {
	if (!isNaN(newValue)) {
		this.setValue(newValue);
	}
}

/** @private @param {Object=} observer (optional) */
Control.prototype.setValue = function(newValue, observer) {
	if (this.value == undefined || Math.abs(newValue - this.value) > 0.000001) { //deal with floating point errors
		this.value = newValue;
		this.updateMappings(observer);
	}
}

/** @private updates all observers different from the one given as an argument */
Control.prototype.updateMappings = function(observer) {
	for (var i = 0; i < this.observers.length; i++) {
		if (this.observers[i] != observer) {
			this.observers[i].observedControlChanged(this.value, this);
		}
	}
}
