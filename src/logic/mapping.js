/**
 * A mapping from features/controls/parameters to parameters.
 * relative means that the function both
 * -takes the change parameters from its domainDims where possible, and
 * -updates its goal parameter relatively
 * @param {Function=} dymoConstraint a function that defines which dymos to map to (optional)
 * @constructor
 */
function Mapping(domainDims, relative, functionJson, targets, parameterName, dymoConstraint) {
	
	/** @private */
	this.relative = relative;
	/** @private */
	this.functionJson = functionJson;
	/** @private */
	this.parameterName = parameterName;
	/** @private */
	this.targets;
	this.setTargets(targets);
	/** @private */
	this.domainDims = domainDims;
	/** @private */
	this.targetParameters;
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
		} else if (this.domainDims[i].addObserver) {
			this.domainDims[i].addObserver(this);
		}
	}
}

Mapping.prototype.setTargets = function(newTargets) {
	if (this.targets) {
		for (var i = 0, ii = this.targetParameters.length; i < ii; i++) {
			this.targetParameters[i].removeUpdater(this);
		}
	}
	this.targets = newTargets;
	this.targetParameters = [];
	for (var i = 0, ii = this.targets.length; i < ii; i++) {
		this.targetParameters[i] = this.targets[i].getParameter(this.parameterName);
		if (!this.targetParameters[i]) {
			//TODO SHOULD ALL PARAMETERS BE CREATED HERE INSTEAD OF IN DYMOLOADER?
			//TODO GET THE STANDARD VALUE FROM STORE!!
			this.targetParameters[i] = new Parameter(this.parameterName);
			this.targets[i].addParameter(this.targetParameters[i]);
		}
		this.targetParameters[i].addUpdater(this);
	}
}

Mapping.prototype.getTargets = function() {
	return this.targets;
}

Mapping.prototype.getDymoConstraint = function() {
	return this.dymoConstraint;
}

Mapping.prototype.disconnect = function() {
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].removeMapping) {
			this.domainDims[i].removeMapping(this);
		} else if (this.domainDims[i].removeObserver) {
			this.domainDims[i].removeObserver(this);
		}
	}
	for (var i = 0; i < this.targetParameters.length; i++) {
		this.targetParameters[i].removeUpdater(this);
	}
}

Mapping.prototype.updateParameter = function() {
	for (var i = 0; i < this.targetParameters.length; i++) {
		if (this.relative) {
			this.targetParameters[i].relativeUpdate(this.calculateParameter(this.targets[i]), this);
		} else {
			this.targetParameters[i].update(this.calculateParameter(this.targets[i]), this);
		}
	}
}

Mapping.prototype.observedParameterChanged = function(param) {
	this.updateParameter();
}

Mapping.prototype.updatedParameterChanged = function(value) {
	//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
	//CURRENTLY ONLY UPDATES IF NO RELATIVE DEF (E.G. NO SUBDYMO-PARAMS)
	if (this.domainDims && this.domainDims[0].backpropagate && !this.relative) {
		if (this.inverseFunction) {
			value = this.inverseFunction(value);
		}
		this.domainDims[0].backpropagate(value, this);
	}
}

Mapping.prototype.requestValue = function(dmo) {
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i].requestValue) {
			this.domainDims[i].requestValue();
		}
	}
	return this.calculateParameter(dmo);
}

Mapping.prototype.toJson = function() {
	var domainJson = [];
	for (var i = 0; i < this.domainDims.length; i++) {
		if (this.domainDims[i] instanceof Control) {
			domainJson.push({name:this.domainDims[i].getName(), type:this.domainDims[i].getType()});
		} else if (this.domainDims[i] instanceof Parameter) {
			domainJson.push({name:this.domainDims[i].getName(), type:"Parameter"});
		} else {
			domainJson.push({name:this.domainDims[i], type:"Feature"});
		}
	}
	var json = {
		"domainDims": domainJson,
		"function": this.functionJson
	}
	var dymos = this.targets.filter(function (d) { return d instanceof DynamicMusicObject; }).map(function (d) { return d.getUri(); });
	var controls = this.targets.filter(function (d) { return !(d instanceof DynamicMusicObject); }).map(function (d) { return d.getUri(); });
	if (dymos.length > 0) {
		json["dymos"] = dymos;
	}
	if (controls.length > 0) {
		json["controls"] = controls;
	}
	json["parameter"] = this.parameterName;
	return json;
}

/** @private */
Mapping.prototype.calculateParameter = function(dymo) {
	var currentDomainValues = [];
	for (var i = 0; i < this.domainDims.length; i++) {
		var currentValue;
		//console.log(this.domainDims[i], typeof this.domainDims[i] === 'string', this.domainDims[i] instanceof String)
		if (typeof this.domainDims[i] === 'string' || this.domainDims[i] instanceof String) {
			//console.log(dymo, dymo.getFeature(this.domainDims[i]))
			currentValue = dymo.getFeature(this.domainDims[i]);
		} else if (this.relative) {
			currentValue = this.domainDims[i].getChange();
		} else {
			//console.log(this.domainDims[i].getValue())
			currentValue = this.domainDims[i].getValue();
		}
		currentDomainValues[i] = currentValue;
	}
	return this.mappingFunction.apply(this, currentDomainValues);
}