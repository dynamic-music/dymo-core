function Control(name, type, requestValueFunction, resetFunction, updateFunction) {
	
	var referenceValue;
	var referenceAverageCount;
	var value;
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
	
	this.addMapping = function(mapping) {
		mappings.push(mapping);
		mapping.updateParameter(value, this);
	}
	
	this.backpropagate = function(newValue, mapping) {
		value = newValue;
		if (updateFunction) {
			updateFunction(value);
		}
		updateMappings(mapping);
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
				value = newValue;
			}
			if (referenceValue) {
				value -= referenceValue;
			}
			updateMappings();
		}
	}
	
	//updates all mappings different from the one given as an argument
	function updateMappings(mapping) {
		for (var i = 0; i < mappings.length; i++) {
			//update all mappings except the backpropagating one
			if (mappings[i] != mapping) {
				mappings[i].updateParameter(value, this);
			}
		}
	}
	
}