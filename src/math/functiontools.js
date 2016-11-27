/**
 * Functions that manipulate and invert simple functions.
 */
function FunctionTools() {}

FunctionTools.IDENTITY_JSON = {"args":["a"],"body":"return a;"};

//saves all conversions done to date so they don't have to be reconverted
/** @private */
FunctionTools.inverted = {};
/** @private */
FunctionTools.created = {};

FunctionTools.createFunction = function(args, body) {
	if (!FunctionTools.created[body]) {
		FunctionTools.created[body] = Function.apply(null, args.concat(body));
	}
	return FunctionTools.created[body];
}

//currently inverts functions that are linear binary trees with
//arithmetic operations, constant leaves, and one variable leaf
FunctionTools.invertFunction = function(body) {
	var returnValue = FunctionTools.toReturnValueString(body);
	if (!FunctionTools.inverted[body]) {
		var inverted = FunctionTools.invertReturnValue(returnValue);
		if (inverted != null) {
			FunctionTools.inverted[body] = FunctionTools.toJavaScriptFunction(inverted[0], inverted[1]);
		}
	}
	return FunctionTools.inverted[body];
}

//currently inverts functions that are linear binary trees with
//arithmetic operations, constant leaves, and one variable leaf
/** @private */
FunctionTools.invertReturnValue = function(returnValue) {
	var currentNode;
	try {
		currentNode = math.parse(returnValue);
	} catch (e) {
		if (!(e instanceof SyntaxError)) {
			console.log(e);
		}
		return;
	}
	var symbolNode = new math.expression.node.SymbolNode('a');
	var invertedTree = symbolNode;
	while (currentNode) {
		if (currentNode.isSymbolNode) {
			symbolNode.name = currentNode.name;
			currentNode = undefined;
		} else if (currentNode.isParenthesisNode) {
			currentNode = currentNode.content;
		} else if (currentNode.isOperatorNode) {
			var invertedOperator = FunctionTools.getInvertedOperator(currentNode.fn);
			if (currentNode.fn == 'unaryMinus') {
				invertedTree = new math.expression.node.OperatorNode('-', 'unaryMinus', [invertedTree]);
				currentNode = FunctionTools.ifNextNode(currentNode.args[0]);
			} else if (currentNode.fn == 'add' || currentNode.fn == 'multiply') {
				if (currentNode.args[0].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(FunctionTools.getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[0]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[1]);
				} else if (currentNode.args[1].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(FunctionTools.getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[1]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[0]);
				} else {
					return;
				}
			} else if (currentNode.fn == 'subtract' || currentNode.fn == 'divide') {
				if (currentNode.args[0].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(FunctionTools.getOp(currentNode.fn), currentNode.fn, [currentNode.args[0], invertedTree]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[1]);
				} else if (currentNode.args[1].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(FunctionTools.getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[1]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[0]);
				} else {
					return;
				}
			} else {
				//TODO DEAL WITH == etc!!!
				return;
			}
		} else {
			return;
		}
	}
	return [symbolNode.name, invertedTree.toString()];
}

FunctionTools.toJavaScriptFunction = function(argName, returnString) {
	try {
		return new Function(argName, "return " + returnString + ";");
	} catch (e) {
		return;
	}
}

/*FunctionTools.fromArgsAndBody = function(args, body) {
	var argsAndBody = args.concat(body);
	return new (Function.prototype.bind.apply(Function, [null].concat(argsAndBody)));
}*/

FunctionTools.toReturnValueString = function(functionString) {
	return functionString.substring(functionString.indexOf("return ")+7, functionString.indexOf(";"));
}

/**
 * returns the given node if a valid next node, undefined otherwise..
 * @private
 */
FunctionTools.ifNextNode = function(node) {
	if (node.isOperatorNode || node.isParenthesisNode || node.isSymbolNode) {
		return node;
	}
}

/** @private */
FunctionTools.getInvertedOperator = function(operator) {
	if (operator == "add") {
		return "subtract";
	} else if (operator == "subtract") {
		return "add";
	} else if (operator == "multiply") {
		return "divide";
	} else if (operator == "divide") {
		return "multiply";
	} else if (operator == "unaryMinus") {
		return "unaryMinus";
	}
}

/** @private weirdly mathjs doesn't seem to offer this */
FunctionTools.getOp = function(fn) {
	if (fn == "add") {
		return "+";
	} else if (fn == "subtract" || fn == "unaryMinus") {
		return "-";
	} else if (fn == "multiply") {
		return "*";
	} else if (fn == "divide") {
		return "/";
	}
}
