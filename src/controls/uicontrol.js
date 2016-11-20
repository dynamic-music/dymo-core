/**
 * A wrapper for dymo-core controls to be used as Angular UI controls.
 * @constructor
 * @param {Object=} $scope angular scope, used to call $scope.$apply (optional)
 */
function UIControl(control, $scope) {

	var self = this;

	this.value = control.getValue();
	control.setUpdateFunction(updateFunction);

	this.getName = function() {
		return control.getName();
	}

	this.getType = function() {
		return control.getType();
	}

	this.update = function() {
		if (control.getType() == BUTTON) {
			if (isNaN(this.value)) {
				this.value = 0;
			}
			this.value = 1-this.value;
		}
		if (this.value == true) {
			control.updateValue(1);
		} else if (this.value == false) {
			control.updateValue(0);
		} else {
			control.updateValue(this.value);
		}
	}

	function updateFunction(newValue) {
		self.value = newValue;
		if ($scope) {
			setTimeout(function() {
				$scope.$apply();
			}, 10);
		}
	}

}
