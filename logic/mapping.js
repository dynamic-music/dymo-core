function Mapping(domainDims, domainFunctions, functionString, dmos, parameterName) {
	
	var currentControlValues = [];
	var mappingFunction = eval(functionString);
	
	this.updateParameter = function(value, control) {
		if (value && control) {
			//TODO REMOVE WITH currentControlValues..
			var controlIndex = domainDims.indexOf(control);
			currentControlValues[controlIndex] = getDomainValue(value, controlIndex);
		}
		for (var i = 0; i < dmos.length; i++) {
			dmos[i].getParameter(parameterName).update(this, calculateParameter(dmos[i]));
		}
	}
	
	function calculateParameter(dmo) {
		var currentDomainValues = [];
		//ADJUST WITH REMOVAL OF currentControlValues
		for (var i = 0; i < domainDims.length; i++) {
			if (typeof domainDims[i] === 'string' || domainDims[i] instanceof String) {
				currentDomainValues[i] = dmo.getFeature(domainDims[i]);
			} else {
				currentDomainValues[i] = currentControlValues[i];
			}
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
				var value = domainDims[i].requestValue();
				if (value || value == 0) {
					currentControlValues[i] = getDomainValue(value, i);
				}
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
		return {
			"domainDims": domainDims,
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