import { GlobalVars } from '../globals/globals'
import { TYPE, PARAMETER_TYPE, VALUE, HAS_PARAMETER } from '../globals/uris'
import { FunctionTools } from '../math/functiontools'
import { LogicTools } from '../math/logictools'

/**
 * A DymoFunction maps a dymoUri to a value based on the given vars, args, and body
 */
export class DymoFunction {

	private vars; // the variables used for the args in the body
	private args; // the parameters/features/controls taken as arguments
	private argTypes;
	private body; // the body of the function
	private argCache = {};
	private resultCache = {};
	private isDymoSpecificParam = [];
	private observers = [];
	private isUnidirectional;
	private directFunction;
	private inverseFunction;
	private constraintFunction

	constructor(vars: string[], args: any[], argTypes, body: string, isUnidirectional) {
		this.vars = vars;
		this.args = args;
		this.argTypes = argTypes;
		this.body = body;
		this.argCache = {};
		this.resultCache = {};
		this.isDymoSpecificParam = [];
		this.observers = [];
		this.isUnidirectional = isUnidirectional;
		this.init();
	}

	private init() {
		if (!this.vars) {
			//make identity in standard case
			this.vars = FunctionTools.IDENTITY_JSON["args"];
			this.body = FunctionTools.IDENTITY_JSON["body"];
		}
		if (this.vars.length <= 1 || this.isUnidirectional) {
			this.directFunction = FunctionTools.createFunction(this.vars, this.body);
			this.inverseFunction = FunctionTools.invertFunction(this.body);
		} else {
			this.constraintFunction = LogicTools.createConstraint(this.body);
			if (!this.constraintFunction) {
				this.directFunction = FunctionTools.createFunction(this.vars, this.body);
			}
		}
		for (var i = 0; i < this.args.length; i++) {
			//observe controls
			if (this.args[i].addObserver) {
				this.args[i].addObserver(this);
			//observe everything else
			} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
				var currentType = GlobalVars.DYMO_STORE.findObject(this.args[i], TYPE);
				if (currentType == PARAMETER_TYPE || GlobalVars.DYMO_STORE.isSubclassOf(currentType, PARAMETER_TYPE)) {
					GlobalVars.DYMO_STORE.addTypeObserver(this.args[i], VALUE, this);
					this.isDymoSpecificParam[i] = true;
				//observe specific parameters
				} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
					GlobalVars.DYMO_STORE.addSpecificParameterObserver(this.args[i], this);
				}
			}
		}
	}

	disconnect() {
		for (var i = 0; i < this.args.length; i++) {
			if (this.args[i].removeObserver) {
				this.args[i].removeObserver(this);
			} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
				var domainDimType = GlobalVars.DYMO_STORE.findObject(this.args[i], TYPE);
				if (GlobalVars.DYMO_STORE.isSubclassOf(domainDimType, PARAMETER_TYPE)) {
					GlobalVars.DYMO_STORE.removeValueObserver(this.args[i], VALUE, this);
				}
			}
		}
	}

	getArgs() {
		return this.args;
	}

	addObserver(observer) {
		this.observers.push(observer);
	}

	private notifyObservers() {
		var self = this;
		this.observers.forEach(o => o.observedFunctionChanged(self));
	}

	applyDirect(changedArgIndex, value, dymoUri) {
		var argValues = this.getArgValues(changedArgIndex, value, dymoUri);
		if (this.constraintFunction) {
			//simply solve for first arg
			this.resultCache[dymoUri] = LogicTools.solveConstraint(this.constraintFunction, ["dummy"].concat(argValues), 0);
			//console.log("DIR", dymoUri, argValues, this.resultCache[dymoUri])
		} else {
			this.resultCache[dymoUri] = this.directFunction.apply(this, argValues);
		}
		return this.resultCache[dymoUri];
	}

	applyInverse(value, dymoUri) {
		if (!this.resultCache[dymoUri] || this.resultCache[dymoUri] != value) {
			if (this.constraintFunction) {
				var updatableArgs = this.args.filter((a,i) => a.backpropagate || this.argTypes[i] == PARAMETER_TYPE);
				var randomUpdatableArg = updatableArgs[Math.floor(Math.random()*updatableArgs.length)];
				var randomArgIndex = this.args.indexOf(randomUpdatableArg);
				var argValues = this.getArgValues(null, null, dymoUri);
				var newArgValue = LogicTools.solveConstraint(this.constraintFunction, [value].concat(argValues), randomArgIndex+1);
				//console.log(randomArgIndex, newArgValue)
				this.updateArg(randomArgIndex, newArgValue);
			} else if (this.inverseFunction && this.args && this.args.length == 1) {
				value = this.inverseFunction(value);
				this.updateArg(0, value);
			}
		}
	}

	private updateArg(index, value) {
		if (this.args[index].backpropagate) {
			this.args[index].backpropagate(value, this);
		} else {
			GlobalVars.DYMO_STORE.setValue(this.args[index], VALUE, value);
		}
	}

	observedControlChanged(value, control) {
		var index = this.args.indexOf(control);
		this.getArgValues(index, value, null);
		this.notifyObservers();
	}

	observedValueChanged(uri, paramType, value) {
		var index = this.args.indexOf(uri);
		if (index < 0) {
			index = this.args.indexOf(paramType);
		}
		if (index > -1) {
			var dymoUri = GlobalVars.DYMO_STORE.findSubject(HAS_PARAMETER, uri);
			this.getArgValues(index, value, dymoUri);
			this.notifyObservers();
		}
	}

	private getArgValues(changedArgIndex, value, dymoUri) {
		var cacheKey = dymoUri ? dymoUri : '';
		if (!this.argCache[cacheKey]) {
			this.argCache[cacheKey] = [];
		}

		if (changedArgIndex != null) {
			if (this.isDymoSpecificParam[changedArgIndex]) {
				//update it for specific dymo
				this.argCache[cacheKey][changedArgIndex] = value;
			} else {
				//update it for all dymos
				Object.keys(this.argCache).map(key => this.argCache[key][changedArgIndex] = value);
			}
		}

		for (var i = 0; i < this.args.length; i++) {
			if (this.argCache[cacheKey][i] == null) {
				this.argCache[cacheKey][i] = this.getArgValue(i, dymoUri);
			}
		}
		return this.argCache[cacheKey].slice(0);
	}

	private getArgValue(index, dymoUri) {
		if (typeof this.args[index] === 'string' || this.args[index] instanceof String) {
			var value = GlobalVars.DYMO_STORE.findObjectValue(this.args[index], VALUE);
			if (value == null) {
				return GlobalVars.DYMO_STORE.findAttributeValue(dymoUri, this.args[index]);
			}
			return value;
		} else {
			//it's a control
			return this.args[index].getValue();
		}
	}

	requestValue(dymoUri) {
		for (var i = 0; i < this.args.length; i++) {
			if (this.args[i].requestValue) {
				this.args[i].requestValue();
			}
		}
		return this.applyDirect(null, null, dymoUri);
	}

}
