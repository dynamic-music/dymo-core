function Parameter(name, initialValue, isInteger) {
	
	var self = this;
	
	var value = initialValue;
	var change = 0; //records amount of last change
	var updaters = [];
	var observers = [];
	
	this.getName = function() {
		return name;
	}
	
	this.getValue = function() {
		return value;
	}
	
	this.getChange = function() {
		return change;
	}
	
	this.addUpdater = function(updater) {
		updaters.push(updater);
		updater.updatedParameterChanged(value);
	}
	
	this.addObserver = function(observer) {
		observers.push(observer);
	}
	
	this.update = function(updater, newValue) {
		if (!isNaN(newValue)) {
			setValueAndNotifyUpdaters(updater, newValue);
			//only notify if value changed
			if (change) {
				notifyObservers();
			}
		}
	}
	
	this.relativeUpdate = function(updater, newChange) {
		this.update(updater, value+newChange);
	}
	
	function notifyObservers() {
		for (var i = 0; i < observers.length; i++) {
			observers[i].observedParameterChanged(self);
		}
	}
	
	function setValueAndNotifyUpdaters(updater, newValue) {
		if (isInteger) {
			newValue = Math.round(newValue);
		}
		change = newValue - value;
		value = newValue;
		//update values of all other updaters connected to this parameter
		for (var i = 0; i < updaters.length; i++) {
			if (updaters[i] != updater) {
				updaters[i].updatedParameterChanged(value);
			}
		}
	}
	
	//returns the first value that it manages to request that is different from this.value
	//returns this.value if none are different
	this.requestValue = function() {
		for (var i = 0; i < this.updaters.length; i++) {
			var requestedValue = updaters[i].requestValue();
			if (requestedValue && requestedValue != value) {
				setValueAndNotifyUpdaters(updaters[i], requestedValue);
				return value;
			}
		}
		return value;
	}
	
}