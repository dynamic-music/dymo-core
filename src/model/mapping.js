/**
 * A mapping from features/controls/parameters to parameters.
 * @constructor
 */
function Mapping(mappingFunction, targets, parameterName) {

	/** @private */
	this.mappingFunction = mappingFunction;
	this.mappingFunction.addObserver(this);
	/** @private */
	this.parameterName = parameterName;
	/** @private */
	this.targetUris;
	/** @private */
	this.targetFunction;
	if (targets) {
		if (targets.length) { //it's an array of uris
			this.setTargetUris(targets);
		} else if (targets) { //it's a constraint function
			this.targetFunction = targets;
			this.targetFunction.addObserver(this);
		}
	}
	this.updateAll();
}

Mapping.prototype.setTargetUris = function(targetUris) {
	if (this.targetUris) {
		for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
			DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
		}
	}
	this.targetUris = targetUris;
	for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
		DYMO_STORE.addParameterObserver(this.targetUris[i], this.parameterName, this);
	}
}

Mapping.prototype.getTargets = function() {
	if (this.targetUris && this.targetUris.length > 0) {
		return this.targetUris;
	} else if (this.targetFunction) {
		var allDymos = DYMO_STORE.findAllSubjects(TYPE, DYMO);
		var tgFunc = this.targetFunction;
		return allDymos.filter(function(d){return tgFunc.applyDirect(null, null, d);});
	}
}

Mapping.prototype.disconnect = function() {
	this.mappingFunction.disconnect();
	this.targetFunction.disconnect();
	for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
		DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
	}
}

/** @private
 * @param {number=} changedArgIndex (optional)
 * @param {number=} value (optional) */
Mapping.prototype.updateAll = function(changedArgIndex, value) {
	var currentTargets = this.getTargets();
	if (currentTargets) {
		for (var i = 0, ii = currentTargets.length; i < ii; i++) {
			this.update(changedArgIndex, value, currentTargets[i]);
		}
	} else {
		//no targets, so global parameter
		this.update(changedArgIndex, value);
	}
}

/** @private
 * @param {string=} target (optional) */
Mapping.prototype.update = function(changedArgIndex, value, target) {
	var newValue = this.mappingFunction.applyDirect(changedArgIndex, value, target);
	DYMO_STORE.setParameter(target, this.parameterName, newValue);
}

Mapping.prototype.observedValueChanged = function(paramUri, paramType, value) {
	if (paramType == this.parameterName) {
		var dymoUri = DYMO_STORE.findSubject(HAS_PARAMETER, paramUri);
		this.mappingFunction.applyInverse(value, dymoUri);
	}
}

Mapping.prototype.observedFunctionChanged = function(func) {
	this.updateAll();
}

Mapping.prototype.requestValue = function(dymoUri) {
	return this.mappingFunction.requestValue(dymoUri);
}
