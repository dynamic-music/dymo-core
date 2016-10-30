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
		FunctionTools.inverted[body] = FunctionTools.toJavaScriptFunction(FunctionTools.invertReturnValue(returnValue));
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
			var invertedOperator = FunctionTools.getInvertedOperator(currentNode.op);
			if (currentNode.op == '+' || currentNode.op == '*') {
				if (currentNode.args[0].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(invertedOperator, FunctionTools.getOperatorName(invertedOperator), [invertedTree, currentNode.args[0]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[1]);
				} else if (currentNode.args[1].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(invertedOperator, FunctionTools.getOperatorName(invertedOperator), [invertedTree, currentNode.args[1]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[0]);
				} else {
					return;
				}
			} else if (currentNode.op == '-' || currentNode.op == '/') {
				if (currentNode.args[0].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(currentNode.op, FunctionTools.getOperatorName(currentNode.op), [currentNode.args[0], invertedTree]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[1]);
				} else if (currentNode.args[1].isConstantNode) {
					invertedTree = new math.expression.node.OperatorNode(invertedOperator, FunctionTools.getOperatorName(invertedOperator), [invertedTree, currentNode.args[1]]);
					currentNode = FunctionTools.ifNextNode(currentNode.args[0]);
				} else {
					return;
				}
			}
		} else {
			return;
		}
	}
	return invertedTree.toString();
}

FunctionTools.toJavaScriptFunction = function(returnString) {
	try {
		return new Function("a", "return " + returnString + ";");
	} catch (e) {
		return;
	}
}

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
	if (operator == "+") {
		return "-";
	} else if (operator == "-") {
		return "+";
	} else if (operator == "*") {
		return "/";
	} else if (operator == "/") {
		return "*";
	}
}

/** @private weirdly mathjs doesn't seem to offer this */
FunctionTools.getOperatorName = function(operator) {
	if (operator == "+") {
		return "add";
	} else if (operator == "-") {
		return "subtract";
	} else if (operator == "*") {
		return "multiply";
	} else if (operator == "/") {
		return "divide";
	}
}
