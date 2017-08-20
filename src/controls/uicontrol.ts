import { BehaviorSubject } from 'rxjs/Rx';
import { BUTTON, TOGGLE } from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Control } from '../model/control';

/**
 * A wrapper for dymo-core controls to be used as Angular UI controls.
 */
export class UIControl {

	private control: Control;
	public name;
	public value;
	private valueStream: BehaviorSubject<any> = new BehaviorSubject(null);

	constructor(uri: string, name: string, type: string, store: DymoStore) {
		this.control = new Control(uri, name, type, store);
		this.name = name;
		this.valueStream
			.auditTime(300)
			.subscribe(v => this.setValue(v));
	}

	getName() {
    return this.control.getName();
  }

	update() {
		if (this.control.getType() == BUTTON) {
			if (isNaN(this.value)) {
				this.value = 0;
			}
			this.value = 1-this.value;
		}
		if (this.value == true) {
			this.valueStream.next(1);
		} else if (this.value == false) {
			this.valueStream.next(0);
		} else {
			this.valueStream.next(this.value);
		}
	}

	protected setValue(newValue): boolean {
		console.log("SET", newValue)
		if (this.control.setValue(newValue)) {
			if (this.control.getType() == TOGGLE) {
				if (newValue == 1) {
					this.value = true;
				} else {
					this.value = false;
				}
			} else {
				this.value = newValue;
			}
			return true;
		}
	}

}
