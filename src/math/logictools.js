/**
 * Creates and solves logical constraints.
 */
function LogicTools() {}

/** @private */
LogicTools.created = {};
/** @private */
LogicTools.varCount = 0;

LogicTools.createConstraint = function(body) {
	if (!LogicTools.created[body]) {
		LogicTools.created[body] = LogicTools.createGoal(LogicTools.toEquation(body));
	}
	return LogicTools.created[body];
}

/** @private */
LogicTools.createGoal = function(returnValue) {
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
	//var goalString = LogicTools.createGoalString(currentNode);
	//return new Function("a", "b", "ret", goalString);
	return LogicTools.createGoalFunction(currentNode);
}

/** @private */
LogicTools.createGoalFunction = function(currentNode) {
	var vars = [];
	var localVars = [];
	//write return string
	var goalString = LogicTools.recursiveCreateGoalString(currentNode, vars, localVars);
	if (goalString) {
		goalString = goalString.slice(0,-1);
		var returnString = "return logic.and(" + goalString + ");";
		//write local variable defs
		var varString = "";
		for (var i = 0; i < localVars.length; i++) {
			varString += "var " + localVars[i] + " = logic.lvar('" + localVars[i] + "');\n";
		}
		//create and return function
		return FunctionTools.createFunction(vars, varString+returnString);
	}
}

/** @private
 * @param {string=} currentString
 * @param {string=} parentVar */
LogicTools.recursiveCreateGoalString = function(currentNode, mainVars, localVars, currentString, parentVar) {
	if (!currentString) currentString = "";
	var rec = LogicTools.recursiveCreateGoalString;
	if (currentNode.isParenthesisNode) {
		return rec(currentNode.content, mainVars, localVars, currentString, parentVar);
	} else if (currentNode.isOperatorNode) {
		var opString = LogicTools.toLogicJsOperatorString(currentNode);
		opString += "(";
		for (var i = 0; i < currentNode.args.length; i++) {
			if (currentNode.args[i].isSymbolNode) {
				var varName = currentNode.args[i].name;
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
				var varName = "v" + LogicTools.varCount++;
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

/** @private */
LogicTools.toLogicJsOperatorString = function(operatorNode) {
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

/** @private */
LogicTools.toEquation = function(functionString) {
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
