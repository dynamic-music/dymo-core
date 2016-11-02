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

DymoFunction.prototype.applyDirect = function(dymoUri) {
	return this.directFunction.apply(this, this.calculateArgValues(dymoUri));
}

DymoFunction.prototype.applyInverse = function(value) {
	return this.inverseFunction(value);
}

DymoFunction.prototype.hasInverse = function(dymoUri) {
	return this.inverseFunction != null;
}

/** @private */
DymoFunction.prototype.calculateArgValues = function(dymoUri) {
	var currentArgValues = [];
	for (var i = 0; i < this.args.length; i++) {
		var currentValue;
		//console.log(this.args[i], typeof this.args[i] === 'string', this.args[i] instanceof String)
		if (typeof this.args[i] === 'string' || this.args[i] instanceof String) {
			currentValue = DYMO_STORE.findAttributeValue(dymoUri, this.args[i]);
			if (currentValue == null) {
				//DYMO_STORE.findObjectValue(highLevelParamUri, VALUE)
				currentValue = DYMO_STORE.findObjectValue(this.args[i], VALUE);
			}
		} else {
			currentValue = this.args[i].getValue();
		}
		currentArgValues[i] = currentValue;
	}
	//console.log(this.args, currentArgValues, this.mappingFunction.apply(this, currentArgValues))
	return currentArgValues;
}

DymoFunction.prototype.requestValue = function(dymoUri) {
	for (var i = 0; i < this.args.length; i++) {
		if (this.args[i].requestValue) {
			this.args[i].requestValue();
		}
	}
	return this.applyDirect(dymoUri);
}
