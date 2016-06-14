/**
 * A control actively changes its value.
 * @param {Object=} parameters (optional)
 * @constructor
 */
function Control(name, type, parameters) {
	
	/** @private */
	this.name = name;
	/** @private */
	this.type = type;
	/** @private */
	this.parameters = parameters;
	/** @private */
	this.value;
	/** @private */
	this.mappings = [];
	/** @private */
	this.updateFunction;
	
}

Control.prototype.getName = function() {
	return this.name;
}

Control.prototype.getParameter = function(name) {
	if (this.parameters) {
		return this.parameters[name];
	}
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

Control.prototype.addMapping = function(mapping) {
	this.mappings.push(mapping);
	mapping.updateParameter(this.value, this);
}

Control.prototype.removeMapping = function(mapping) {
	var i = this.mappings.indexOf(mapping);
	if (i > -1) {
		this.mappings.splice(i, 1);
	}
}

Control.prototype.backpropagate = function(newValue, mapping) {
	if (isFinite(newValue)) {
		this.setValue(newValue, mapping);
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

/** @private @param {Object=} mapping (optional) */
Control.prototype.setValue = function(newValue, mapping) {
	if (this.value == undefined || Math.abs(newValue - this.value) > 0.000001) { //deal with floating point errors
		this.value = newValue;
		this.updateMappings(mapping);
	}
}

/** @private updates all mappings different from the one given as an argument */
Control.prototype.updateMappings = function(mapping) {
	for (var i = 0; i < this.mappings.length; i++) {
		if (this.mappings[i] != mapping) {
			this.mappings[i].updateParameter(this.value, this);
		}
	}
}