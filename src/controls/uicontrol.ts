import { BUTTON, TOGGLE } from '../globals/uris';
import { Control } from '../model/control';

/**
 * A wrapper for dymo-core controls to be used as Angular UI controls.
 */
export class UIControl extends Control {

	private uiValue;

	update() {
		if (this.getType() == BUTTON) {
			if (isNaN(this.uiValue)) {
				this.uiValue = 0;
			}
			this.uiValue = 1-this.uiValue;
		}
		if (this.uiValue == true) {
			this.setValue(1);
		} else if (this.uiValue == false) {
			this.setValue(0);
		} else {
			this.setValue(this.uiValue);
		}
	}

	protected setValue(newValue): boolean {
		if (super.setValue(newValue)) {
			if (this.getType() == TOGGLE) {
				if (newValue == 1) {
					this.uiValue = true;
				} else {
					this.uiValue = false;
				}
			} else {
				this.uiValue = newValue;
			}
			return true;
		}
	}

}
