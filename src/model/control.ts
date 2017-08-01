import { VALUE } from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';

/**
 * A control actively changes its value.
 */
export class Control {

  protected value: number;
  private observers = [];
  private backpropFunction: Function;

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

  setBackpropFunction(func: Function) {
    this.backpropFunction = func;
  }

  addObserver(observer) {
    this.observers.push(observer);
    //observer.observedControlChanged(this.value, this);
  }

  removeObserver(observer) {
    var i = this.observers.indexOf(observer);
    if (i > -1) {
      this.observers.splice(i, 1);
    }
  }

  backpropagate(newValue, observer) {
    if (isFinite(newValue)) {
      this.setValue(newValue, observer);
      if (this.backpropFunction) {
        this.backpropFunction(this.value);
      }
    }
  }

  updateValue(newValue) {
    if (!isNaN(newValue)) {
      this.setValue(newValue);
    }
  }

  private setValue(newValue, observer?) {
    if (this.value == undefined || Math.abs(newValue - this.value) > 0.000001) { //deal with floating point errors
      this.value = newValue;
      this.store.setValue(this.uri, VALUE, newValue);
      this.updateMappings(observer);
    }
  }

  observedValueChanged(uri: string, type: string, value: number | string) {
    if (uri === this.uri) {
      this.setValue(value);
    }
  }

  private updateMappings(observer) {
    for (var i = 0; i < this.observers.length; i++) {
      if (this.observers[i] != observer) {
        this.observers[i].observedControlChanged(this.value, this);
      }
    }
  }

}
