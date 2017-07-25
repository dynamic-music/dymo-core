import * as _ from 'lodash';
import * as math from 'mathjs';
import * as u from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { Maintainer } from './maintainer';
import { MathjsNode } from '../globals/types';

export class Expression {

  isFunction: boolean;
  private mathjsTree: MathjsNode;
  private treeWithoutFuncs: MathjsNode;
  private compiledFunction: Object;
  private varsAndFuncs: Map<string,MathjsNode> = new Map<string,MathjsNode>(); //map with vars and funcs
  private currentlyObservedVars: Map<Object,Object> = new Map<Object,Object>();

  constructor(expressionString: string, isFunction?: boolean, mathjsTree?: MathjsNode) {
    this.mathjsTree = mathjsTree ? mathjsTree : math.parse(expressionString);
    this.isFunction = isFunction && this.checkIfFunctionPossible();
    this.treeWithoutFuncs = this.replaceFunctionalExpressions(this.mathjsTree);
  }

  private checkIfFunctionPossible(): boolean {
    return this.mathjsTree.isOperatorNode && this.mathjsTree["fn"] === "equal"
      && (this.mathjsTree["args"][0].isSymbolNode || this.mathjsTree["args"][0].isFunctionNode);
  }

  getFullTree(): MathjsNode {
    return this.mathjsTree;
  }

  getVarsAndFuncs() {
    return this.varsAndFuncs;
  }

  evaluate(vars: Object, store: DymoStore): any {
    //first gather all functional values
    let varsAndVals = {};
    this.varsAndFuncs.forEach((f,v) =>
      varsAndVals[v] = this.getValue(this.getFunctionalObject(f, vars, store), store));
    //then eval function with values
    return this.treeWithoutFuncs.eval(varsAndVals);
  }

  maintain(vars: Object, store: DymoStore) {
    let varsAndObjects = new Map<string,string>();
    this.varsAndFuncs.forEach((v,k) => varsAndObjects.set(k, this.getFunctionalObject(v, vars, store)));
    this.currentlyObservedVars.set(vars, new Maintainer(varsAndObjects, this.treeWithoutFuncs, this.isFunction, store));
  }

  stopMaintaining(vars: Object) {

  }

  private getValue(uri: string, store: DymoStore) {
    let value = store.findObjectValue(uri, u.VALUE);
    return value ? value : uri;
  }

  private getFunctionalObject(expression: MathjsNode, vars: Object, store: DymoStore): string {
    if (expression.isFunctionNode) {
      let arg = this.getFunctionalObject(expression["args"][0], vars, store);
      let funcName = u.DYMO_ONTOLOGY_URI+expression["fn"]["name"];
      //console.log(value, u.DYMO_ONTOLOGY_URI+func["fn"]["name"], u.PITCH_FEATURE, store.findObject(value, u.DYMO_ONTOLOGY_URI+func["fn"]["name"]))
      let result = store.findObject(arg, funcName);
      if (!result) {
        result = store.findObjectOfType(arg, u.HAS_PARAMETER, funcName);
      }
      if (!result) {
        result = store.findObjectOfType(arg, u.HAS_FEATURE, funcName);
      }
      return result;
    }
    //it's the innermost symbol node
    return vars[expression.name];
  }

  private replaceFunctionalExpressions(mathjsTree: MathjsNode) {
    let varCount = 0;
    return mathjsTree.transform(node => {
      if (node.isFunctionNode || node.isSymbolNode) {
        let currentVarname = "v"+varCount++;
        this.varsAndFuncs.set(currentVarname, node);
        return new math.expression.node.SymbolNode(currentVarname);
      }
      return node;
    });
  }

  toString(): string {
    return this.mathjsTree.toString();
  }

}