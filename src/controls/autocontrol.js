/**
 * Autocontrols that use statistics to set their values.
 * @constructor
 * @extends {Control}
 * @param {Function=} resetFunction (optional)
 */
function AutoControl(controlName, updateFunction, resetFunction) {
	
	var self = this;
	
	var parameters = {};
	addParameter(new Parameter(AUTO_CONTROL_FREQUENCY, 100));
	addParameter(new Parameter(AUTO_CONTROL_TRIGGER, 0));
	Control.call(this, controlName, AUTO_CONTROL, parameters);
	
	var intervalID;
	
	function addParameter(param) {
		var paramName = param.getName();
		parameters[paramName] = param;
		parameters[paramName].addObserver(self);
	}
	this.addParameter = addParameter;
	
	this.getParameter = function(paramName) {
		return parameters[paramName];
	}
	
	this.startUpdate = function() {
		intervalID = setInterval(updateFunction, parameters[AUTO_CONTROL_FREQUENCY].getValue());
	}
	
	this.reset = function() {
		clearInterval(intervalID);
		intervalID = null;
		if (resetFunction) {
			resetFunction();
		}
	}
	
	this.observedParameterChanged = function(param) {
		if (param == parameters[AUTO_CONTROL_FREQUENCY]) {
			if (intervalID) {
				this.reset();
				this.startUpdate();
			}
		} else if (param == parameters[AUTO_CONTROL_TRIGGER]) {
			if (!intervalID) {
				this.startUpdate();
			} else {
				this.reset();
			}
		}
	}
	
}
inheritPrototype(AutoControl, Control);