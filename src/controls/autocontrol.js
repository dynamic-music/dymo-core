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
	startUpdate();
	
	function addParameter(param) {
		var paramName = param.getName();
		parameters[paramName] = param;
		parameters[paramName].addObserver(self);
	}
	this.addParameter = addParameter;
	
	this.getParameter = function(paramName) {
		return parameters[paramName];
	}
	
	function startUpdate() {
		intervalID = setInterval(updateFunction, parameters[AUTO_CONTROL_FREQUENCY].getValue());
	}
	
	this.reset = function() {
		clearInterval(intervalID);
		if (resetFunction) {
			resetFunction();
		}
	}
	
	this.observedParameterChanged = function(param) {
		if (param == parameters[AUTO_CONTROL_FREQUENCY]) {
			this.reset();
			startUpdate();
		} else if (param.getName() == AUTO_CONTROL_TRIGGER) {
			if (!intervalID) {
				startUpdate();
			} else {
				this.reset();
			}
		}
	}
	
}
inheritPrototype(AutoControl, Control);