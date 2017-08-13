import * as _ from 'lodash';
import * as u from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Constraint } from '../model/constraint';
import { Expression } from '../model/expression';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../model/variable';
import { ExpressionTools } from '../math/expressiontools';
import { MathjsNode } from '../globals/types';

export class ConstraintWriter {

  constructor(private store: DymoStore) {}

  addConstraint(ownerUri: string, constraint: Constraint): string {
    let varUris = constraint.getBoundVariables().map(v => this.addVariable(v));
    var expressionUri = this.addExpression(constraint.getExpression());
    var expUri = this.recursiveAddUniversalQuantifiers(varUris, expressionUri);
    this.store.addTriple(ownerUri, u.CONSTRAINT, expUri);
    return expUri;
  }

  addVariable(variable: BoundVariable): string {
    let varUri = this.store.createBlankNode();
    this.store.addTriple(varUri, u.TYPE, u.VARIABLE);
    this.store.setValue(varUri, u.VAR_NAME, variable.getName());
    if (variable instanceof TypedVariable) {
      this.store.addTriple(varUri, u.VAR_TYPE, variable.getType());
    }
    if (variable instanceof ExpressionVariable) {
      variable.getTypeExpressions().forEach(e => this.store.addTriple(varUri, u.VAR_EXPR, this.addExpression(e)));
    }
    if (variable instanceof SetBasedVariable) {
      variable.getSet().forEach(v => this.store.addTriple(varUri, u.VAR_VALUE, v));
    }
    return varUri;
  }

  private recursiveAddUniversalQuantifiers(varUris: string[], expressionUri: string): string {
    let currentQuantifier = this.store.createBlankNode();
    this.store.addTriple(currentQuantifier, u.VARS, _.last(varUris));
    this.store.addTriple(currentQuantifier, u.TYPE, u.FOR_ALL);
    this.store.addTriple(currentQuantifier, u.BODY, expressionUri);
    if (varUris.length > 1) {
      return this.recursiveAddUniversalQuantifiers(_.initial(varUris), currentQuantifier);
    }
    return currentQuantifier;
  }

  private addExpression(expression: Expression): string {
    let rootUri = this.recursiveAddExpression(expression.getFullTree());
    this.store.setValue(rootUri, u.DIRECTED, expression.isDirected);
    return rootUri;
  }

  private recursiveAddExpression(mathjsTree: MathjsNode): string {
    let currentNodeUri;
    if (mathjsTree.isAssignmentNode) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.EQUAL_TO);
      this.addTripleOrSetValue(currentNodeUri, u.LEFT, this.recursiveAddExpression(mathjsTree.args[0]));
      this.addTripleOrSetValue(currentNodeUri, u.RIGHT, this.recursiveAddExpression(mathjsTree.args[1]));
    } else if (mathjsTree.isOperatorNode) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, ExpressionTools.toUri(mathjsTree.fn));
      this.addTripleOrSetValue(currentNodeUri, u.LEFT, this.recursiveAddExpression(mathjsTree.args[0]));
      this.addTripleOrSetValue(currentNodeUri, u.RIGHT, this.recursiveAddExpression(mathjsTree.args[1]));
    } else if (mathjsTree.isFunctionNode) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.FUNCTIONAL_TERM);
      this.store.setValue(currentNodeUri, u.FUNCTION, mathjsTree.fn);
      this.store.setTriple(currentNodeUri, u.ARGS, this.recursiveAddExpression(mathjsTree.args[0]));
    } else if (mathjsTree.isSymbolNode) {
      currentNodeUri = this.store.findSubject(u.VAR_NAME, mathjsTree.name);
    } else if (mathjsTree.isConstantNode) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.CONSTANT);
      this.setValue(currentNodeUri, u.VALUE, mathjsTree.value);
    } else if (mathjsTree.isParenthesisNode) {
      return this.recursiveAddExpression(mathjsTree.content);
    }
    return currentNodeUri;
  }

  private addTripleOrSetValue(subject: string, predicate: string, object: string) {
    if (this.store.find(object, null, null).length > 0) {
      //is an existing uri
      this.store.addTriple(subject, predicate, object);
    } else {
      //is a value
      this.setValue(subject, predicate, object);
    }
  }

  private setValue(subject: string, predicate: string, object: any) {
    let number = Number.parseFloat(object);
    object = !isNaN(number) ? number : object;
    this.store.setValue(subject, predicate, object);
  }

}