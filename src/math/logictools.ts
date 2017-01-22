import * as math from 'mathjs'
import { FunctionTools } from '../math/functiontools'

/**
 * Creates and solves logical constraints.
 */
export module LogicTools {

	let created = {};
	let varCount = 0;

	export function createConstraint(body) {
		if (!created[body]) {
			created[body] = createGoal(toEquation(body));
		}
		return created[body];
	}

	function createGoal(returnValue) {
		var currentNode;
		try {
			currentNode = math.parse(returnValue);
		} catch (e) {
			if (!(e instanceof SyntaxError)) {
				console.log(e);
			}
			return;
		}
		//TODO GET ALL SYMBOLS
		//var goalString = createGoalString(currentNode);
		//return new Function("a", "b", "ret", goalString);
		return createGoalFunction(currentNode);
	}

	function createGoalFunction(currentNode) {
		var vars = [];
		var localVars = [];
		//write return string
		var goalString = recursiveCreateGoalString(currentNode, vars, localVars);
		if (goalString) {
			goalString = goalString.slice(0,-1);
			var returnString = "return logic.and(" + goalString + ");";
			//write local variable defs
			var varString = "";
			for (var i = 0; i < localVars.length; i++) {
				varString += "var " + localVars[i] + " = logic.lvar('" + localVars[i] + "');\n";
			}
			//VERY IMPORTANT: LOGIC NEEDS TO BE PASSED TO THE FUNCTION
			vars.push("logic");
			//create and return function
			return FunctionTools.createFunction(vars, varString+returnString);
		}
	}

	function recursiveCreateGoalString(currentNode, mainVars, localVars, currentString?: string, parentVar?: string) {
		if (!currentString) currentString = "";
		var rec = recursiveCreateGoalString;
		if (currentNode.isParenthesisNode) {
			return rec(currentNode.content, mainVars, localVars, currentString, parentVar);
		} else if (currentNode.isOperatorNode) {
			var opString = toLogicJsOperatorString(currentNode);
			opString += "(";
			for (var i = 0; i < currentNode.args.length; i++) {
				if (currentNode.args[i].isSymbolNode) {
					let varName = currentNode.args[i].name;
					opString += varName;
					if (mainVars.indexOf(varName) < 0) {
						mainVars.push(varName);
					} else {
						//unsolvable with logicjs if one variable occurs multiple times
						return;
					}
				} else if (currentNode.args[i].isConstantNode && currentNode.args[i].valueType == "number") {
					opString += currentNode.args[i].value;
				} else {
					let varName = "v" + varCount++;
					localVars.push(varName);
					opString += varName;
					var partGoal = rec(currentNode.args[i], mainVars, localVars, currentString, varName);
					if (!partGoal) {
						//unsolvable with logicjs if one variable occurs multiple times
						return;
					}
					currentString += partGoal;
				}
				if (i < currentNode.args.length-1) {
					opString += ",";
				}
			}
			if (parentVar) {
				opString += ","+parentVar;
			}
			opString += "),";
			return currentString + opString;
		}
	}

	function toLogicJsOperatorString(operatorNode) {
		if (operatorNode.op == '==') {
			return "logic.eq";
		} else if (operatorNode.op == '+') {
			return "logic.add";
		} else if (operatorNode.op == '-') {
			return "logic.sub";
		} else if (operatorNode.op == '*') {
			return "logic.mul";
		} else if (operatorNode.op == '/') {
			return "logic.div";
		}
	}

	function toEquation(functionString) {
		//remove return string
		var scIndex = functionString.indexOf(";");
		if (scIndex >= 0) {
			functionString = functionString.substring(functionString.indexOf("return ")+7, functionString.indexOf(";"));
		} else {
			functionString = functionString.substring(functionString.indexOf("return ")+7);
		}
		//add return symbol
		return "ret == "+functionString;
	}

}
