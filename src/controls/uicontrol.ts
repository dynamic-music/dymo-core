import { BUTTON, TOGGLE } from '../globals/uris'

/**
 * A wrapper for dymo-core controls to be used as Angular UI controls.
 * @param {Object=} $scope angular scope, used to call $scope.$apply (optional)
 */
export class UIControl {

	private control;
	private value;
	private $scope;

	constructor(control, $scope?) {
		this.value = control.getValue();
		this.control = control;
		this.$scope = $scope;
		this.control.setUpdateFunction(this.updateFunction);
	}

	getName() {
		return this.control.getName();
	}

	getType() {
		return this.control.getType();
	}

	update() {
		if (this.control.getType() == BUTTON) {
			if (isNaN(this.value)) {
				this.value = 0;
			}
			this.value = 1-this.value;
		}
		if (this.value == true) {
			this.control.updateValue(1);
		} else if (this.value == false) {
			this.control.updateValue(0);
		} else {
			this.control.updateValue(this.value);
		}
	}

	private updateFunction(newValue) {
		if (this.control.getType() == TOGGLE) {
			if (newValue == 1) {
				this.value = true;
			} else {
				this.value = false;
			}
		} else {
			this.value = newValue;
		}
		if (this.$scope) {
			setTimeout(function() {
				this.$scope.$apply();
			}, 10);
		}
	}

}
