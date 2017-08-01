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
  private currentMaintainers: Map<Object,Maintainer> = new Map<Object,Maintainer>();

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
    this.varsAndFuncs.forEach((f,v) => {
      let value = this.getValue(this.getFunctionalObject(f, vars, store), store);
      if (value != null) {
        varsAndVals[v] = value;
      }
    });
    //then eval function with values
    return this.treeWithoutFuncs.eval(varsAndVals);
  }

  maintain(vars: Object, store: DymoStore) {
    if (!this.currentMaintainers.has(vars)) {
      let varsAndUris = new Map<string,string>();
      let featureFreeTree = this.treeWithoutFuncs;
      //gather the functional objects for all variables and add constants where possible
      this.varsAndFuncs.forEach((f,v) => {
        let objectUri = this.getFunctionalObject(f, vars, store);
        let objectType = store.findObject(objectUri, u.TYPE);
        if (objectType === u.FEATURE_TYPE || store.isSubtypeOf(objectType, u.FEATURE_TYPE)) {
          //replace features (which are immutable) with constants
          let featureNode = new math.expression.node.ConstantNode(store.findObjectValue(objectUri, u.VALUE));
          featureFreeTree = this.replaceSymbolInTree(featureFreeTree, v, featureNode);
        } else {
          varsAndUris.set(v, objectUri);
        }
      });
      this.currentMaintainers.set(vars, new Maintainer(varsAndUris, featureFreeTree, this.isFunction, store));
    }
  }

  stopMaintaining() {
    this.currentMaintainers.forEach(m => m.stop());
    this.currentMaintainers = new Map<Object,Maintainer>();
  }

  private replaceSymbolInTree(tree: MathjsNode, symbol: string, newNode: MathjsNode) {
    return tree.transform(node => node.isSymbolNode && node.name === symbol ? newNode : node);
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
      if (result == null) {
        result = store.findObjectOfType(arg, u.HAS_PARAMETER, funcName);
      }
      if (result == null) {
        result = store.findObjectOfType(arg, u.HAS_FEATURE, funcName);
      }
      if (result == null) {
        result = store.findObjectOfType(arg, u.HAS_CONTROL_PARAM, u.MOBILE_AUDIO_ONTOLOGY_URI+expression["fn"]["name"]);
      }
      if (result == null && funcName === u.LEVEL_FEATURE) {
        result = store.findLevel(arg);
      }
      if (result == null && funcName === u.INDEX_FEATURE) {
        result = store.findPartIndex(arg);
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