import { BehaviorSubject } from 'rxjs/Rx';
import { BUTTON, TOGGLE, AUTO_CONTROL_FREQUENCY } from '../globals/uris';
import { SuperDymoStore } from '../globals/types';
import { Control } from '../model/control';

/**
 * A wrapper for dymo-core controls to be used as Angular UI controls.
 */
export class UIControl extends Control {

	public uiValue;
	private inValueStream: BehaviorSubject<any> = new BehaviorSubject(null);
	private outValueStream: BehaviorSubject<any> = new BehaviorSubject(null);

	constructor(uri: string, name: string, type: string, store: SuperDymoStore) {
		super(uri, name, type, store);
		this.init();
	}

	private async init() {
		let frequency = await this.store.findControlParamValue(this.uri, AUTO_CONTROL_FREQUENCY);
		frequency = frequency ? frequency : 100;
		this.inValueStream
			.auditTime(frequency)
			.subscribe(v => this.setValue(v));
	}

	private setUIValue(newValue) {
		this.uiValue = newValue;
		this.outValueStream.next(newValue);
	}

	getUIValueObserver(): BehaviorSubject<any> {
		return this.outValueStream;
	}

	update() {
		if (this.getType() == BUTTON) {
			if (isNaN(this.uiValue)) {
				this.setUIValue(0);
			}
			this.setUIValue(1-this.uiValue);
		}
		if (this.uiValue == true) {
			this.inValueStream.next(1);
		} else if (this.uiValue == false) {
			this.inValueStream.next(0);
		} else {
			this.inValueStream.next(this.uiValue);
		}
	}

	//for use outside of ui (simulation and tests)
	/*updateValue(value) {
		this.uiValue = value;
		this.update();
	}*/

	//called from above when the Control's value changes
	protected setValue(newValue): boolean {
		if (super.setValue(newValue)) {
			if (this.getType() == TOGGLE) {
				if (newValue == 1) {
					this.setUIValue(true);
				} else {
					this.setUIValue(false);
				}
			} else {
				this.setUIValue(newValue);
			}
			return true;
		}
	}

}
