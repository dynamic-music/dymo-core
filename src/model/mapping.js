/**
 * A mapping from features/controls/parameters to parameters.
 * relative means that the function both
 * -takes the change parameters from its domainDims where possible, and
 * -updates its goal parameter relatively
 * @param {Function=} dymoConstraint a function that defines which dymos to map to (optional)
 * @constructor
 */
function Mapping(domainDims, relative, functionJson, targetUris, parameterName, dymoConstraint) {

	/** @private */
	this.relative = relative;
	/** @private */
	this.functionJson = functionJson;
	/** @private */
	this.parameterName = parameterName;
	/** @private */
	this.targetUris;
	this.setTargets(targetUris);
	/** @private */
	this.domainDims = domainDims;
	/** @private */
	this.dymoConstraint = dymoConstraint;
	this.init();
}

/** @private */
Mapping.prototype.init = function() {
	if (!this.functionJson) {
		this.functionJson = FunctionTools.IDENTITY_JSON; //make identity in standard case
	}
	this.mappingFunction = FunctionTools.createFunction(this.functionJson["args"], this.functionJson["body"]);
	this.inverseFunction = FunctionTools.invertFunction(this.functionJson["body"]);
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].addMapping) {
			this.domainDims[i].addMapping(this);
		} else if (typeof this.domainDims[i] === 'string' || this.domainDims[i] instanceof String) {
			DYMO_STORE.addSpecificParameterObserver(this.domainDims[i], this);
		}
	}
}

Mapping.prototype.setTargets = function(newTargets) {
	if (this.targetUris) {
		for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
			DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
		}
	}
	this.targetUris = newTargets;
	for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
		DYMO_STORE.addParameterObserver(this.targetUris[i], this.parameterName, this);
	}
}

Mapping.prototype.getTargets = function() {
	return this.targetUris;
}

Mapping.prototype.getDymoConstraint = function() {
	return this.dymoConstraint;
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
	if (this.targetUris.length > 0) {
		for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
			DYMO_STORE.setParameter(this.targetUris[i], this.parameterName, this.calculateParameter(this.targetUris[i]));
		}
	} else {
		//no targets, so global parameter
		DYMO_STORE.setParameter(null, this.parameterName, this.calculateParameter(this.targetUris[i]));
	}
}

Mapping.prototype.observedValueChanged = function(paramUri, paramType, value) {
	//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
	//TODO DEAL WITH DIFFERENT TARGETS!!!
	//CURRENTLY ONLY UPDATES IF NO RELATIVE DEF (E.G. NO SUBDYMO-PARAMS)
	if (this.domainDims.indexOf(paramUri) > -1) {
		this.updateParameter();
	} else if (this.domainDims && this.domainDims[0].backpropagate && !this.relative) {
		if (this.inverseFunction) {
			value = this.inverseFunction(value);
		}
		this.domainDims[0].backpropagate(value, this);
	}
}

Mapping.prototype.observedParameterChanged = function(param) {
	this.updateParameter();
}

Mapping.prototype.requestValue = function(dymoUri) {
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].requestValue) {
			this.domainDims[i].requestValue();
		}
	}
	return this.calculateParameter(dymoUri);
}

/** @private */
Mapping.prototype.calculateParameter = function(dymo) {
	var currentDomainValues = [];
	for (var i = 0; i < this.domainDims.length; i++) {
		var currentValue;
		//console.log(this.domainDims[i], typeof this.domainDims[i] === 'string', this.domainDims[i] instanceof String)
		if (typeof this.domainDims[i] === 'string' || this.domainDims[i] instanceof String) {
			currentValue = DYMO_STORE.findAttributeValue(dymo, this.domainDims[i]);
			if (currentValue == null) {
				//DYMO_STORE.findObjectValue(highLevelParamUri, VALUE)
				currentValue = DYMO_STORE.findObjectValue(this.domainDims[i], VALUE);
			}
		} else {
			currentValue = this.domainDims[i].getValue();
		}
		currentDomainValues[i] = currentValue;
	}
	//console.log(this.domainDims, currentDomainValues, this.mappingFunction.apply(this, currentDomainValues))
	return this.mappingFunction.apply(this, currentDomainValues);
}
