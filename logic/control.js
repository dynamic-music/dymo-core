function Control(name, type, requestValueFunction, resetFunction, updateFunction) {
	
	var value;
	var referenceValue;
	var referenceAverageCount;
	var mappings = [];
	if (requestValueFunction) {
		this.requestValue = function() {
			value = requestValueFunction();
			return value;
		}
	}
	if (resetFunction) {
		this.reset = resetFunction;
	}
	var currentNumAddends, currentSum;
	
	
	this.getName = function() {
		return name;
	}
	
	this.getValue = function() {
		return value;
	}
	
	this.getType = function() {
		return type;
	}
	
	this.getReferenceValue = function() {
		return referenceValue;
	}
	
	this.setReferenceAverageCount = function(count) {
		referenceAverageCount = count;
		this.resetReferenceValue();
	}
	
	this.resetReferenceValue = function() {
		value = undefined;
		referenceValue = undefined;
		currentNumAddends = 0;
		currentSum = 0;
	}
	
	this.setUpdateFunction = function(func) {
		updateFunction = func;
	}
	
	this.addMapping = function(mapping) {
		mappings.push(mapping);
		mapping.updateParameter(value, this);
	}
	
	this.backpropagate = function(newValue, mapping) {
		if (isFinite(newValue)) {
			setValue(newValue, mapping);
			if (updateFunction) {
				updateFunction(value);
			}
		}
	}
	
	this.update = function(newValue) {
		//still measuring reference value
		if (referenceAverageCount && currentNumAddends < referenceAverageCount) {
			currentSum += newValue;
			currentNumAddends++;
			//done measuring values. calculate average
			if (currentNumAddends == referenceAverageCount) {
				currentSum /= referenceAverageCount;
				referenceValue = currentSum;
			}
		//done measuring. adjust value if initialvalue taken
		} else {
			if (newValue) {
				if (referenceValue) {
					newValue -= referenceValue;
				}
				setValue(newValue);
			}
		}
	}
	
	function setValue(newValue, mapping) {
		if (value == undefined || Math.abs(newValue - value) > 0.000001) { //deal with floating point errors
			value = newValue;
			updateMappings(mapping);
		}
	}
	
	//updates all mappings different from the one given as an argument
	function updateMappings(mapping) {
		for (var i = 0; i < mappings.length; i++) {
			if (mappings[i] != mapping) {
				mappings[i].updateParameter(value, this);
			}
		}
	}
	
}