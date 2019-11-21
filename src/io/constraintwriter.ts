import * as _ from 'lodash';
import * as u from '../globals/uris';
import { EasyStore } from '../io/easystore';
import { Expression } from '../model/expression';
import { ExpressionTools } from '../math/expressiontools';
import { MathjsNode, OperatorNode, FunctionNode, AccessorNode, ConditionalNode } from '../globals/mathjs-types';
import { ConstraintGhost, BoundVariableGhost, ExpressionGhost } from '../globals/types';

export class ConstraintWriter {

  constructor(private store: EasyStore) {}

  addConstraint(ownerUri: string, constraint: ConstraintGhost): string {
    let varUris = constraint.vars.map(v => this.addVariable(v));
    var expressionUri = this.addExpression(constraint.expression);
    var expUri = this.recursiveAddUniversalQuantifiers(varUris, expressionUri);
    this.store.addTriple(ownerUri, u.CONSTRAINT, expUri);
    return expUri;
  }

  addVariable(variable: BoundVariableGhost): string {
    let varUri = this.store.createBlankNode();
    this.store.addTriple(varUri, u.TYPE, u.VARIABLE);
    this.store.setValue(varUri, u.VAR_NAME, variable.name);
    if (variable.type) {
      this.store.addTriple(varUri, u.VAR_TYPE, variable.type);
    }
    if (variable.typeExpressions) {
      variable.typeExpressions.forEach(e =>
        this.store.addTriple(varUri, u.VAR_EXPR, this.addExpression(e)));
    }
    if (variable.set) {
      variable.set.forEach(v => this.store.addTriple(varUri, u.VAR_VALUE, v));
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

  private addExpression(ghost: ExpressionGhost): string {
    let expression = new Expression(ghost.expressionString, ghost.isDirected);
    let rootUri = this.recursiveAddExpression(expression.getFullTree());
    this.store.setValue(rootUri, u.DIRECTED, expression.getIsDirected());
    return rootUri;
  }

  private recursiveAddExpression(mathjsTree: MathjsNode): string {
    let currentNodeUri;
    if (!mathjsTree) return;
    if (mathjsTree.isAssignmentNode) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.EQUAL_TO);
      this.addTripleOrSetValue(currentNodeUri, u.LEFT, this.recursiveAddExpression(mathjsTree.args[0]));
      this.addTripleOrSetValue(currentNodeUri, u.RIGHT, this.recursiveAddExpression(mathjsTree.args[1]));
    } else if (mathjsTree.isOperatorNode) {
      let opNode = <OperatorNode>mathjsTree;
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, ExpressionTools.toUri(opNode.fn));
      this.addTripleOrSetValue(currentNodeUri, u.LEFT, this.recursiveAddExpression(opNode.args[0]));
      this.addTripleOrSetValue(currentNodeUri, u.RIGHT, this.recursiveAddExpression(opNode.args[1]));
    } else if (mathjsTree.isFunctionNode) {
      let fnNode = <FunctionNode>mathjsTree;
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.FUNCTIONAL_TERM);
      let func;
      if (fnNode.fn.isSymbolNode) {
        func = this.store.createBlankNode();
        this.store.addTriple(func, u.TYPE, u.NAMED_FUNCTION);
        this.setValue(func, u.NAME, fnNode.fn.name);
      } else {
        func = this.recursiveAddExpression(fnNode.fn);
      }
      this.store.addTriple(currentNodeUri, u.FUNC, func);
      this.store.setTriple(currentNodeUri, u.ARGS, this.recursiveAddExpression(mathjsTree.args[0]));
    } else if (isConditionalNode(mathjsTree)) {
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.CONDITIONAL);
      const {condition, trueExpr, falseExpr} = mathjsTree;
      const add = (predicate: string, node: MathjsNode) =>
        this.addTripleOrSetValue(
          currentNodeUri,
          predicate,
          this.recursiveAddExpression(node)
        );
      add(u.ANTECEDENT, condition);
      add(u.CONSEQUENT, trueExpr);
      add(u.ALTERNATIVE, falseExpr);
    } else if (mathjsTree.isAccessorNode) {
      let accNode = <AccessorNode>mathjsTree;
      currentNodeUri = this.store.createBlankNode();
      this.store.addTriple(currentNodeUri, u.TYPE, u.ACCESSOR);
      this.setValue(currentNodeUri, u.OBJECT, accNode.object.name);
      this.setValue(currentNodeUri, u.PROPERTY, accNode.name);
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

function isConditionalNode(node: MathjsNode): node is ConditionalNode {
  return node.isConditionalNode;
}