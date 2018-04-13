import { VALUE } from '../globals/uris';
import { DymoStore } from '../io/dymostore-service';

/**
 * A control actively changes its value.
 */
export class Control {

  private value: number;

  constructor(protected uri: string, private name: string, private type: string, protected store: DymoStore) {
    this.store.addValueObserver(this.uri, VALUE, this);
  }

  getName() {
    return this.name;
  }

  getUri() {
    return this.uri;
  }

  getValue(): number {
    return this.value;
  }

  getType() {
    return this.type;
  }

  updateValue(newValue) {
    if (!isNaN(newValue)) {
      this.setValue(newValue);
    }
  }

  protected resetValue() {
    this.value = undefined;
    this.store.setValue(this.uri, VALUE, null);
  }

  protected setValue(newValue): boolean {
    if (this.value == undefined || Math.abs(newValue - this.value) > 0.000001) { //deal with floating point errors
      this.value = newValue;
      this.store.setValue(this.uri, VALUE, newValue);
      return true;
    }
  }

  observedValueChanged(uri: string, type: string, value: number | string) {
    if (uri === this.uri) {
      this.setValue(value);
    }
  }

}
