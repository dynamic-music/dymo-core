import * as _ from 'lodash';
import * as math from 'mathjs';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Constraint } from '../model/constraint';
import { BoundVariable } from '../model/variable';
import { Expression } from '../model/expression';
import { ExpressionTools } from '../math/expressiontools';

export class ConstraintLoader {

  private vars: BoundVariable[] = [];

  constructor(private store: DymoStore) {}

  loadConstraints(renderingUri: string) {
    let constraintUris = this.store.findAllObjects(renderingUri, uris.CONSTRAINT);
    let constraints = constraintUris.map(c => this.createConstraint(c));
    return _.zipObject(constraintUris, constraints);
  }

  private createConstraint(constraintUri: string): Constraint {
    let body = this.recursiveLoadBoundVariables(constraintUri);
    return new Constraint(this.vars, this.loadExpression(body));
  }

  //returns the body of the innermost bound variable (the meat of the expression)
  private recursiveLoadBoundVariables(expressionUri: string): string {
    let expressionType = this.store.findObject(expressionUri, uris.TYPE);
    if (this.store.isSubclassOf(expressionType, uris.QUANTIFIER)) {
      let varUri = this.store.findObject(expressionUri, uris.VARS);
      let varName = this.store.findObjectValue(varUri, uris.VAR_NAME);
      let varType = this.store.findObject(varUri, uris.VAR_TYPE);
      let varExpr = this.store.findObject(varUri, uris.VAR_EXPR);
      let body = this.store.findObject(expressionUri, uris.Q_BODY);
      this.vars.push(new BoundVariable(varName, varType, this.loadExpression(varExpr)));
      return this.recursiveLoadBoundVariables(body);
    }
    return expressionUri;
  }

  private loadExpression(expressionUri: string): Expression {
    if (expressionUri) {
      let isFunction = this.store.findObjectValue(expressionUri, uris.IS_FUNCTION);
      return new Expression(null, isFunction, this.recursiveLoadExpression(expressionUri));
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
      let name = this.store.findObjectValue(expressionUri, uris.T_FUNCTION);
      //console.log(name, this.store.findObject(expressionUri, uris.T_ARGS))
      let args = this.recursiveLoadExpression(this.store.findObject(expressionUri, uris.T_ARGS));
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