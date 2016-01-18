/*
 * relative means that the function both
 * -takes the change parameters from its domainDims where possible, and
 * -updates its goal parameter relatively
 */
function Mapping(domainDims, relative, functionString, targets, parameterName) {
	
	var inverter = new FunctionInverter();
	if (!functionString) {
		functionString = "new Function(\"a\", \"return a;\");"; //make identity in standard case
	}
	var mappingFunction = eval(functionString);
	
	var inverseFunction;
	var inverseString = inverter.invert(inverter.toReturnValueString(functionString));
	if (inverseString) {
		inverseFunction = eval(inverter.toJavaScriptFunctionString(inverseString));
	}
	
	
	this.updateParameter = function() {
		for (var i = 0; i < targets.length; i++) {
			if (relative) {
				targets[i].getParameter(parameterName).relativeUpdate(calculateParameter(targets[i]), this);
			} else {
				targets[i].getParameter(parameterName).update(calculateParameter(targets[i]), this);
			}
		}
	}
	
	this.observedParameterChanged = function(param) {
		this.updateParameter();
	}
	
	this.updatedParameterChanged = function(value) {
		//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
		//CURRENTLY ONLY UPDATES IF NO RELATIVE DEF (E.G. NO SUBDYMO-PARAMS)
		if (domainDims[0].backpropagate && !relative) {
			if (inverseFunction) {
				value = inverseFunction(value);
			}
			domainDims[0].backpropagate(value, this);
		}
	}
	
	function calculateParameter(dmo) {
		var currentDomainValues = [];
		for (var i = 0; i < domainDims.length; i++) {
			var currentValue;
			if (typeof domainDims[i] === 'string' || domainDims[i] instanceof String) {
				currentValue = dmo.getFeature(domainDims[i]);
			} else if (relative) {
				currentValue = domainDims[i].getChange();
			} else {
				currentValue = domainDims[i].getValue();
			}
			currentDomainValues[i] = currentValue;
		}
		return mappingFunction.apply(this, currentDomainValues);
	}
	
	this.requestValue = function(dmo) {
		for (var i = 0; i < domainDims.length; i++) {
			if (domainDims[i].requestValue) {
				domainDims[i].requestValue();
			}
		}
		return calculateParameter(dmo);
	}
	
	this.toJson = function() {
		var domainJson = [];
		for (var i = 0; i < domainDims.length; i++) {
			if (domainDims[i] instanceof Control) {
				domainJson.push({name:domainDims[i].getName(), type:domainDims[i].getType()});
			} else if (domainDims[i] instanceof Parameter) {
				domainJson.push({name:domainDims[i].getName(), type:"Parameter"});
			} else {
				domainJson.push({name:domainDims[i], type:"Feature"});
			}
		}
		var json = {
			"domainDims": domainJson,
			"function": functionString
		}
		var dymos = targets.filter(function (d) { return d instanceof DynamicMusicObject; }).map(function (d) { return d.getUri(); });
		var controls = targets.filter(function (d) { return !(d instanceof DynamicMusicObject); }).map(function (d) { return d.getUri(); });
		if (dymos.length > 0) {
			json["dymos"] = dymos;
		}
		if (controls.length > 0) {
			json["controls"] = controls;
		}
		json["parameter"] = parameterName;
		return json;
	}
	
	//javascript modulo sucks
	function moduloAsItShouldBe(m, n) {
		return ((m % n) + n) % n;
	}
	
	//TODO PUT IN METHOD
	for (var i = 0; i < domainDims.length; i++) {
		if (domainDims[i].addMapping) {
			domainDims[i].addMapping(this);
		} else if (domainDims[i].addObserver) {
			domainDims[i].addObserver(this);
		}
	}
	for (var i = 0; i < targets.length; i++) {
		targets[i].getParameter(parameterName).addUpdater(this);
	}
	
}