function Parameter(name, initialValue, isInteger, isUpdateAbsolute) {
	
	var self = this;
	
	this.name = name;
	this.value = initialValue;
	this.change = 0; //records amout of last change
	var updaters = [];
	var observers = [];
	
	this.addUpdater = function(updater) {
		updaters.push(updater);
		updater.updatedParameterChanged(this.value);
	}
	
	this.addObserver = function(observer) {
		observers.push(observer);
	}
	
	this.update = function(updater, value) {
		if (!isNaN(value)) {
			setValueAndNotifyUpdaters(updater, value);
			//only notify if value changed
			console.log(name, updater, value, this.change)
			if (this.change) {
				notifyObservers();
			}
		}
	}
	
	this.relativeUpdate = function(change) {
		this.update(undefined, this.value+change);
	}
	
	function notifyObservers() {
		for (var i = 0; i < observers.length; i++) {
			observers[i].observedParameterChanged(self);
		}
	}
	
	function setValueAndNotifyUpdaters(updater, value) {
		if (isInteger) {
			value = Math.round(value);
		}
		self.change = value - self.value;
		self.value = value;
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
			var value = updaters[i].requestValue();
			if (value && value != this.value) {
				setValueAndNotifyUpdaters(updaters[i], value);
				return this.value;
			}
		}
		return this.value;
	}
	
	/*//resets all the updaters
	this.reset = function() {
		for (var i = 0; i < this.updaters.length; i++) {
			this.updaters[i].reset();
		}
	}*/
	
}