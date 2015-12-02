/*
 * relative means that the function both
 * -takes the change parameters from its domainDims where possible, and
 * -updates its goal parameter relatively
 */
function Mapping(domainDims, relative, functionString, dmos, parameterName) {
	
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
		for (var i = 0; i < dmos.length; i++) {
			if (relative) {
				dmos[i].getParameter(parameterName).relativeUpdate(calculateParameter(dmos[i]), this);
			} else {
				dmos[i].getParameter(parameterName).update(calculateParameter(dmos[i]), this);
			}
		}
	}
	
	this.observedParameterChanged = function(param) {
		this.updateParameter();
	}
	
	this.updatedParameterChanged = function(value) {
		//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
		if (domainDims[0].backpropagate) {
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
				domainJson.push({name:domainDims[i].name, type:domainDims[i].type});
			} else {
				domainJson.push({name:domainDims[i], type:"Feature"});
			}
		}
		return {
			"domainDims": domainJson,
			"function": functionString,
			"dmos": dmos.map(function (d) { return d.getUri(); }),
			"parameter": parameterName
		}
	}
	
	//javascript modulo sucks
	function moduloAsItShouldBe(m, n) {
		return ((m % n) + n) % n;
	}
	
	//TODO PUT IN METHOD
	for (var i = 0; i < domainDims.length; i++) {
		if (domainDims[i].addMapping) {
			domainDims[i].addMapping(this);
		}
	}
	for (var i = 0; i < dmos.length; i++) {
		dmos[i].getParameter(parameterName).addUpdater(this);
	}
	
}