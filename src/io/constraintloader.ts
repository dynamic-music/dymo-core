import * as _ from 'lodash';
import * as math from 'mathjs';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Constraint } from '../model/constraint';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../model/variable';
import { Expression } from '../model/expression';
import { ExpressionTools } from '../math/expressiontools';

export class ConstraintLoader {

  constructor(private store: DymoStore) {}

  loadConstraints(constraintUris: string[]): Constraint[] {
    let constraints = constraintUris.map(c => this.createConstraint(c));
    return constraints;//_.zipObject(constraintUris, constraints);
  }

  private createConstraint(constraintUri: string): Constraint {
    let vars = [];
    let body = this.recursiveLoadBoundVariables(constraintUri, vars);
    return new Constraint(vars, this.loadExpression(body));
  }

  //returns the body of the innermost bound variable (the meat of the expression)
  private recursiveLoadBoundVariables(expressionUri: string, vars: BoundVariable[]): string {
    let expressionType = this.store.findObject(expressionUri, uris.TYPE);
    if (this.store.isSubclassOf(expressionType, uris.QUANTIFIER)) {
      let varUri = this.store.findObject(expressionUri, uris.VARS);
      let body = this.store.findObject(expressionUri, uris.BODY);
      vars.push(this.loadVariable(varUri));
      return this.recursiveLoadBoundVariables(body, vars);
    }
    return expressionUri;
  }

  loadVariable(varUri: string): BoundVariable {
    let varName = this.store.findObjectValue(varUri, uris.VAR_NAME);
    let varType = this.store.findObject(varUri, uris.VAR_TYPE);
    let varExpr = this.store.findObject(varUri, uris.VAR_EXPR);
    let values = this.store.findAllObjects(varUri, uris.VAR_VALUE);
    if (varExpr) {
      return new ExpressionVariable(varName, varType, this.loadExpression(varExpr));
    } else if (values.length > 0) {
      return new SetBasedVariable(varName, values);
    }
    return new TypedVariable(varName, varType);
  }

  private loadExpression(expressionUri: string): Expression {
    if (expressionUri) {
      let isDirected = this.store.findObjectValue(expressionUri, uris.DIRECTED);
      return new Expression(null, isDirected, this.recursiveLoadExpression(expressionUri));
    }
  }

  private recursiveLoadExpression(expressionUri: string) {
    let expressionType = this.store.findObject(expressionUri, uris.TYPE);
    //console.log(expressionUri, expressionType)
    if (this.store.isSubclassOf(expressionType, uris.BINARY_OPERATOR)) {
      let left = this.recursiveLoadExpression(this.store.findObject(expressionUri, uris.LEFT));
      let right = this.recursiveLoadExpression(this.store.findObject(expressionUri, uris.RIGHT));
      return ExpressionTools.toOperatorNode(expressionType, [left, right]);
    } else if (expressionType === uris.FUNCTIONAL_TERM) {
      let name = this.store.findObjectValue(expressionUri, uris.FUNCTION);
      //console.log(name, this.store.findObject(expressionUri, uris.T_ARGS))
      let args = this.recursiveLoadExpression(this.store.findObject(expressionUri, uris.ARGS));
      return new math.expression.node.FunctionNode(name, [args]);
    } else if (expressionType === uris.VARIABLE) {
      let name = this.store.findObjectValue(expressionUri, uris.VAR_NAME);
      return new math.expression.node.SymbolNode(name);
    } else {
      let value = this.store.findObjectValue(expressionUri, uris.VALUE);
      return new math.expression.node.ConstantNode(value);
    }
  }

}