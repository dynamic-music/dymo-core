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
}

DymoFunction.prototype.getArgs = function() {
	return this.args;
}

DymoFunction.prototype.applyDirect = function(changedArgIndex, value, dymoUri) {
	//console.log(this.directFunction.apply(this, this.getArgValues(changedArgIndex, value, dymoUri)), changedArgIndex, value)
	return this.directFunction.apply(this, this.getArgValues(changedArgIndex, value, dymoUri));
}

DymoFunction.prototype.applyInverse = function(value) {
	return this.inverseFunction(value);
}

DymoFunction.prototype.hasInverse = function(dymoUri) {
	return this.inverseFunction != null;
}

/** @private */
DymoFunction.prototype.getArgValues = function(changedArgIndex, value, dymoUri) {
	var cacheKey = dymoUri ? dymoUri : '';
	if (!this.argCache[cacheKey]) {
		this.argCache[cacheKey] = [];
	}

	if (changedArgIndex != null) {
		this.argCache[cacheKey][changedArgIndex] = value;
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
