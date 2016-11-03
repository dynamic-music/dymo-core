/**
 * A mapping from features/controls/parameters to parameters.
 * @constructor
 */
function Mapping(mappingFunction, targets, parameterName) {

	/** @private */
	this.domainDims = mappingFunction.getArgs();
	/** @private */
	this.mappingFunction = mappingFunction;
	/** @private */
	this.parameterName = parameterName;
	/** @private */
	this.targetUris;
	/** @private */
	this.targetFunction;
	if (targets && targets.length) { //it's an array of uris
		this.setTargetUris(targets);
	} else { //it's a constraint function
		this.targetFunction = targets;
	}
	this.init();
}

/** @private */
Mapping.prototype.init = function() {
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].addMapping) {
			this.domainDims[i].addMapping(this);
		} else if (typeof this.domainDims[i] === 'string' || this.domainDims[i] instanceof String) {
			DYMO_STORE.addSpecificParameterObserver(this.domainDims[i], this);
		}
	}
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
		return allDymos.filter(function(d){return tgFunc.applyDirect(d);});
	}
}

Mapping.prototype.disconnect = function() {
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].removeMapping) {
			this.domainDims[i].removeMapping(this);
		} else if (typeof this.domainDims[i] === 'string' || this.domainDims[i] instanceof String) {
			var domainDimType = DYMO_STORE.findObject(this.domainDims[i], TYPE);
			if (DYMO_STORE.isSubclassOf(domainDimType, PARAMETER_TYPE)) {
				DYMO_STORE.removeValueObserver(this.domainDims[i], VALUE, this);
			}
		}
	}
	for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
		DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
	}
}

Mapping.prototype.updateParameter = function() {
	var currentTargets = this.getTargets();
	if (currentTargets) {
		for (var i = 0, ii = currentTargets.length; i < ii; i++) {
			DYMO_STORE.setParameter(currentTargets[i], this.parameterName, this.mappingFunction.applyDirect(currentTargets[i]));
		}
	} else {
		//no targets, so global parameter
		DYMO_STORE.setParameter(null, this.parameterName, this.mappingFunction.applyDirect());
	}
}

Mapping.prototype.observedValueChanged = function(paramUri, paramType, value) {
	//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
	//TODO DEAL WITH DIFFERENT TARGETS!!!
	//CURRENTLY ONLY UPDATES IF NO RELATIVE DEF (E.G. NO SUBDYMO-PARAMS)
	if (this.domainDims.indexOf(paramUri) > -1) {
		this.updateParameter();
	} else if (this.domainDims && this.domainDims.length == 1 && this.domainDims[0].backpropagate) {
		if (this.mappingFunction.hasInverse()) {
			value = this.mappingFunction.applyInverse(value);
			if (value != null) {
				this.domainDims[0].backpropagate(value, this);
			}
		}
	}
}

Mapping.prototype.requestValue = function(dymoUri) {
	return this.mappingFunction.requestValue(dymoUri);
}
