/**
 * Autocontrols that use statistics to set their values.
 * @constructor
 * @extends {Control}
 * @param {Function=} updateFunction (optional)
 * @param {Function=} resetFunction (optional)
 */
function AutoControl(uri, name, updateFunction, resetFunction) {

	var self = this;

	DYMO_STORE.addParameter(uri, AUTO_CONTROL_FREQUENCY, 100, self);
	DYMO_STORE.addParameter(uri, AUTO_CONTROL_TRIGGER, 0, self);
	Control.call(this, uri, name, AUTO_CONTROL);

	var intervalID;

	/*this.getParameter = function(paramName) {
		return parameters[paramName];
	}*/

	/** @param {number=} frequency (optional) */
	this.startUpdate = function(frequency) {
		if (!frequency) {
			frequency = DYMO_STORE.findParameterValue(uri, AUTO_CONTROL_FREQUENCY);
		}
		if (updateFunction) {
			intervalID = setInterval(updateFunction, frequency);
		}
	}

	this.reset = function() {
		clearInterval(intervalID);
		intervalID = null;
		if (resetFunction) {
			resetFunction();
		}
	}

	this.observedValueChanged = function(paramUri, paramType, value) {
		if (paramType == AUTO_CONTROL_FREQUENCY) {
			if (intervalID) {
				this.reset();
				this.startUpdate(value);
			}
		} else if (paramType == AUTO_CONTROL_TRIGGER) {
			if (!intervalID) {
				this.startUpdate();
			} else {
				this.reset();
			}
		}
	}

}
inheritPrototype(AutoControl, Control);
