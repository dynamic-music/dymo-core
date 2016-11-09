/**
 * A DymoFunction maps a dymoUri to a value based on the given vars, args, and body
 * @param {Array} vars the variables denoting the args in the body
 * @param {Array} args the parameters/features/controls taken as arguments
 * @param {Array} body the body of the function
 * @constructor
 */
function DymoFunction(vars, args, body) {

	/** @private the variables used for the args in the body */
	this.vars = vars;
	/** @private the parameters/features/controls taken as arguments */
	this.args = args;
	/** @private */
	this.body = body;
	/** @private */
	this.argCache = {};
	/** @private */
	this.isDymoSpecificParam = [];
	/** @private */
	this.observers = [];
	this.init();
}

/** @private */
DymoFunction.prototype.init = function() {
	if (!this.vars) {
		//make identity in standard case
		this.vars = FunctionTools.IDENTITY_JSON["args"];
		this.body = FunctionTools.IDENTITY_JSON["body"];
	}
	this.directFunction = FunctionTools.createFunction(this.vars, this.body);
	this.inverseFunction = FunctionTools.invertFunction(this.body);
	for (var i = 0; i < this.args.length; i++) {
		//observe controls
		if (this.args[i].addObserver) {
			this.args[i].addObserver(this);
		//observe everything else
		} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
			var currentType = DYMO_STORE.findObject(this.args[i], TYPE);
			if (currentType == PARAMETER_TYPE || DYMO_STORE.isSubclassOf(currentType, PARAMETER_TYPE)) {
				DYMO_STORE.addTypeObserver(this.args[i], VALUE, this);
				this.isDymoSpecificParam[i] = true;
			//observe specific parameters
			} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
				DYMO_STORE.addSpecificParameterObserver(this.args[i], this);
			}
		}
	}
}

DymoFunction.prototype.disconnect = function() {
	for (var i = 0; i < this.args.length; i++) {
		if (this.args[i].removeObserver) {
			this.args[i].removeObserver(this);
		} else if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
			var domainDimType = DYMO_STORE.findObject(this.args[i], TYPE);
			if (DYMO_STORE.isSubclassOf(domainDimType, PARAMETER_TYPE)) {
				DYMO_STORE.removeValueObserver(this.args[i], VALUE, this);
			}
		}
	}
}

DymoFunction.prototype.getArgs = function() {
	return this.args;
}

DymoFunction.prototype.addObserver = function(observer) {
	this.observers.push(observer);
}

/** @private */
DymoFunction.prototype.notifyObservers = function() {
	var self = this;
	this.observers.forEach(function(o){o.observedFunctionChanged(self);});
}

DymoFunction.prototype.applyDirect = function(changedArgIndex, value, dymoUri) {
	return this.directFunction.apply(this, this.getArgValues(changedArgIndex, value, dymoUri));
}

DymoFunction.prototype.applyInverse = function(value, dymoUri) {
	if (this.inverseFunction && this.args && this.args.length == 1 && this.args[0].backpropagate) {
		value = this.inverseFunction(value);
		if (value != null) {
			this.args[0].backpropagate(value, this);
		}
	}
}

DymoFunction.prototype.observedControlChanged = function(value, control) {
	var index = this.args.indexOf(control);
	this.getArgValues(index, value, null);
	this.notifyObservers();
}

DymoFunction.prototype.observedValueChanged = function(uri, paramType, value) {
	var index = this.args.indexOf(uri);
	if (index < 0) {
		index = this.args.indexOf(paramType);
	}
	if (index > -1) {
		var dymoUri = DYMO_STORE.findSubject(HAS_PARAMETER, uri);
		this.getArgValues(index, value, dymoUri);
		this.notifyObservers();
	}
}

/** @private */
DymoFunction.prototype.getArgValues = function(changedArgIndex, value, dymoUri) {
	var cacheKey = dymoUri ? dymoUri : '';
	if (!this.argCache[cacheKey]) {
		this.argCache[cacheKey] = [];
	}

	if (changedArgIndex != null) {
		if (this.isDymoSpecificParam[changedArgIndex]) {
			this.argCache[cacheKey][changedArgIndex] = value;
		} else {
			var cache = this.argCache;
			Object.keys(cache).map(function(key) { cache[key][changedArgIndex] = value; });
		}
	}

	for (var i = 0; i < this.args.length; i++) {
		if (this.argCache[cacheKey][i] == null) {
			this.argCache[cacheKey][i] = this.getArgValue(i, dymoUri);
		}
	}
	return this.argCache[cacheKey];
}

/** @private */
DymoFunction.prototype.getArgValue = function(index, dymoUri) {
	if (typeof this.args[index] === 'string' || this.args[index] instanceof String) {
		var value = DYMO_STORE.findObjectValue(this.args[index], VALUE);
		if (value == null) {
			return DYMO_STORE.findAttributeValue(dymoUri, this.args[index]);
		}
		return value;
	} else {
		//it's a control
		return this.args[index].getValue();
	}
}

DymoFunction.prototype.requestValue = function(dymoUri) {
	for (var i = 0; i < this.args.length; i++) {
		if (this.args[i].requestValue) {
			this.args[i].requestValue();
		}
	}
	return this.applyDirect(null, null, dymoUri);
}
