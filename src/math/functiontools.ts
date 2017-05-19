import * as math from 'mathjs'

/**
 * Tools to manipulate and invert simple functions.
 */
export module FunctionTools {

	export const IDENTITY_JSON = {"args":["a"],"body":"return a;"};

	//saves all conversions done to date so they don't have to be reconverted
	let inverted = {};
	/** @private */
	let created = {};

	export function createFunction(args, body) {
		if (!created[body]) {
			created[body] = Function.apply(null, args.concat(body));
		}
		return created[body];
	}

	//currently inverts functions that are linear binary trees with
	//arithmetic operations, constant leaves, and one variable leaf
	export function invertFunction(body) {
		var returnValue = toReturnValueString(body);
		if (!inverted[body]) {
			var inversion = invertReturnValue(returnValue);
			if (inversion != null) {
				inverted[body] = toJavaScriptFunction(inversion[0], inversion[1]);
			}
		}
		return inverted[body];
	}

	//currently inverts functions that are linear binary trees with
	//arithmetic operations, constant leaves, and one variable leaf
	export function invertReturnValue(returnValue) {
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
				var invertedOperator = getInvertedOperator(currentNode.fn);
				if (currentNode.fn == 'unaryMinus') {
					invertedTree = new math.expression.node.OperatorNode('-', 'unaryMinus', [invertedTree]);
					currentNode = ifNextNode(currentNode.args[0]);
				} else if (currentNode.fn == 'add' || currentNode.fn == 'multiply') {
					if (currentNode.args[0].isConstantNode) {
						invertedTree = new math.expression.node.OperatorNode(getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[0]]);
						currentNode = ifNextNode(currentNode.args[1]);
					} else if (currentNode.args[1].isConstantNode) {
						invertedTree = new math.expression.node.OperatorNode(getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[1]]);
						currentNode = ifNextNode(currentNode.args[0]);
					} else {
						return;
					}
				} else if (currentNode.fn == 'subtract' || currentNode.fn == 'divide') {
					if (currentNode.args[0].isConstantNode) {
						invertedTree = new math.expression.node.OperatorNode(getOp(currentNode.fn), currentNode.fn, [currentNode.args[0], invertedTree]);
						currentNode = ifNextNode(currentNode.args[1]);
					} else if (currentNode.args[1].isConstantNode) {
						invertedTree = new math.expression.node.OperatorNode(getOp(invertedOperator), invertedOperator, [invertedTree, currentNode.args[1]]);
						currentNode = ifNextNode(currentNode.args[0]);
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

	export function toJavaScriptFunction(argName, returnString) {
		try {
			return new Function(argName, "return " + returnString + ";");
		} catch (e) {
			return;
		}
	}

	export function toReturnValueString(functionString) {
		var index = functionString.indexOf("return ");
		if (index >= 0) {
			return functionString.substring(index+7, functionString.indexOf(";"));
		}
		return functionString;
	}

	/**
	 * returns the given node if a valid next node, undefined otherwise..
	 * @private
	 */
	function ifNextNode(node) {
		if (node.isOperatorNode || node.isParenthesisNode || node.isSymbolNode) {
			return node;
		}
	}

	/** @private */
	function getInvertedOperator(operator) {
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
	function getOp(fn) {
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

}
