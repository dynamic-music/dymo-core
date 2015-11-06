function Control(referenceAverageOf, name, type, scope, requestValueFunction, resetFunction, updateFunction) {
	
	this.referenceValue;
	this.value;
	this.mappings = [];
	if (name) {
		this.name = name;
	}
	this.type = type;
	if (requestValueFunction) {
		this.requestValue = function() {
			this.value = requestValueFunction();
			return this.value;
		}
	}
	if (resetFunction) {
		this.reset = resetFunction;
	}
	var currentNumAddends, currentSum;
	
	this.resetReferenceValue = function() {
		this.value = null;
		this.referenceValue = null;
		currentNumAddends = 0;
		currentSum = 0;
	}
	
	this.addMapping = function(mapping) {
		this.mappings.push(mapping);
		mapping.updateParameter(this.value, this);
	}
	
	this.updateValue = function(value) {
		this.value = value;
		if (updateFunction) {
			updateFunction(value);
		}
	}
	
	this.updateMappings = function(value) {
		//still measuring reference value
		if (referenceAverageOf && currentNumAddends < referenceAverageOf) {
			currentSum += value;
			currentNumAddends++;
			//done measuring values. calculate average
			if (currentNumAddends == referenceAverageOf) {
				currentSum /= referenceAverageOf;
				this.referenceValue = currentSum;
			}
		//done measuring. adjust value if initialvalue taken
		} else {
			if (value) {
				this.value = value;
			}
			if (this.referenceValue) {
				this.value -= this.referenceValue;
			}
			for (var i = 0; i < this.mappings.length; i++) {
				this.mappings[i].updateParameter(this.value, this);
			}
		}
	}
	
	//initialize
	if (referenceAverageOf) {
		this.resetReferenceValue();
	}
	
}