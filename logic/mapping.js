function Mapping(domainDims, domainFunctions, functionString, dmos, parameterName) {
	
	var mappingFunction = eval(functionString);
	
	this.updateParameter = function(value, control) {
		for (var i = 0; i < dmos.length; i++) {
			dmos[i].getParameter(parameterName).update(this, calculateParameter(dmos[i]));
		}
	}
	
	function calculateParameter(dmo) {
		var currentDomainValues = [];
		for (var i = 0; i < domainDims.length; i++) {
			var currentValue;
			if (typeof domainDims[i] === 'string' || domainDims[i] instanceof String) {
				currentValue = dmo.getFeature(domainDims[i]);
			} else {
				currentValue = domainDims[i].value;
			}
			currentDomainValues[i] = getDomainValue(currentValue, i);
		}
		return mappingFunction.apply(this, currentDomainValues);
	}
	
	function getDomainValue(value, i) {
		if (domainFunctions && domainFunctions[i]) {
			return domainFunctions[i].getValue(value);
		}
		return value;
	}
	
	this.updateControl = function(value) {
		//TODO MAPPING NOT POSSIBLE IF SEVERAL DIMENSIONS
		if (domainDims.length == 1 && domainDims[0].updateValue) {
			//CALCULATE INVERSE FUNCTION :)
			domainDims[0].updateValue(value);
		}
	}
	
	this.requestValue = function(dmo) {
		for (var i = 0; i < domainDims.length; i++) {
			if (domainDims[i].requestValue) {
				domainDims[i].requestValue();
			}
		}
		return calculateParameter(dmo);
	}
	
	this.reset = function() {
		for (var i = 0; i < domainDims.length; i++) {
			if (domainDims[i].reset) {
				domainDims[i].reset();
			}
		}
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
	
	for (var i = 0; i < domainDims.length; i++) {
		if (domainDims[i].addMapping) {
			domainDims[i].addMapping(this);
		}
	}
	for (var i = 0; i < dmos.length; i++) {
		dmos[i].getParameter(parameterName).addMapping(this);
	}
	
}