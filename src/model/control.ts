/**
 * A control actively changes its value.
 */
export class Control {

	protected uri;
	private name;
	private type;
	private value;
	private observers = [];
	private backpropFunction;

	constructor(uri, name, type) {
		this.uri = uri;
		this.name = name;
		this.type = type;
	}

	getName() {
		return this.name;
	}

	getUri() {
		return this.uri;
	}

	getValue() {
		return this.value;
	}

	getType() {
		return this.type;
	}

	setBackpropFunction(func) {
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
			this.updateMappings(observer);
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
