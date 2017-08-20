import * as _ from 'lodash';
import * as math from 'mathjs';
import * as u from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { Maintainer } from './maintainer';
import { MathjsNode } from '../globals/types';

export class Expression {

  isDirected: boolean;
  private mathjsTree: MathjsNode;
  private treeWithoutFuncs: MathjsNode;
  private compiledFunction: Object;
  private varsAndFuncs: Map<string,MathjsNode> = new Map<string,MathjsNode>(); //map with vars and funcs
  private currentMaintainers: Map<Object,Maintainer> = new Map<Object,Maintainer>();

  constructor(expressionString: string, isDirected?: boolean, mathjsTree?: MathjsNode) {
    this.mathjsTree = mathjsTree ? mathjsTree : math.parse(expressionString);
    this.isDirected = isDirected && this.checkIfFunctionPossible();
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
    if (_.keys(vars).length === _.keys(varsAndVals).length) {
      //all values could be found, so eval function with values
      return this.treeWithoutFuncs.eval(varsAndVals);
    }
  }

  maintain(vars: Object, store: DymoStore) {
    if (!this.currentMaintainers.has(vars)) {
      let varsAndUris = new Map<string,string>();
      let featureFreeTree = this.treeWithoutFuncs;
      //gather the functional objects for all variables and add constants where possible
      this.varsAndFuncs.forEach((f,v) => {
        let objectUriOrVal = this.getFunctionalObject(f, vars, store);
        let objectType = store.findObject(objectUriOrVal, u.TYPE);
        if (objectType === u.FEATURE_TYPE || store.isSubtypeOf(objectType, u.FEATURE_TYPE)) {
          //replace features (which are immutable) with constants
          let featureNode = new math.expression.node.ConstantNode(store.findObjectValue(objectUriOrVal, u.VALUE));
          featureFreeTree = this.replaceSymbolInTree(featureFreeTree, v, featureNode);
        } else if (objectUriOrVal != null && typeof objectUriOrVal !== 'string') {
          //insert numerical and boolean constants TODO also string ones....
          let featureNode = new math.expression.node.ConstantNode(objectUriOrVal);
          featureFreeTree = this.replaceSymbolInTree(featureFreeTree, v, featureNode);
        } else {
          varsAndUris.set(v, objectUriOrVal);
        }
      });
      this.currentMaintainers.set(vars, new Maintainer(varsAndUris, featureFreeTree, this.isDirected, store));
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

  private getFunctionalObject(expression: MathjsNode, vars: Object, store: DymoStore): any {
    if (expression.isFunctionNode) {
      let arg = this.getFunctionalObject(expression["args"][0], vars, store);
      let funcName = u.DYMO_ONTOLOGY_URI+expression["fn"]["name"];
      //console.log(value, u.DYMO_ONTOLOGY_URI+func["fn"]["name"], u.PITCH_FEATURE, store.findObject(value, u.DYMO_ONTOLOGY_URI+func["fn"]["name"]))
      let result = store.findObject(arg, funcName);
      if (result == null) {
        result = store.findObjectOfType(arg, u.HAS_CONTROL_PARAM, u.MOBILE_AUDIO_ONTOLOGY_URI+expression["fn"]["name"]);
      }
      if (result == null) {
        result = this.findOrInitFeatureOrParam(arg, funcName, store);
      }
      if (result == null) {
        result = this.findOrInitFeatureOrParam(arg, u.CONTEXT_URI+expression["fn"]["name"], store);
      }
      return result;
    }
    //it's the innermost symbol node
    return vars[expression.name];
  }

  private findOrInitFeatureOrParam(owner: string, type: string, store: DymoStore): string|number {
    //deal with extra-store features
    if (type === u.LEVEL_FEATURE) {
      return store.findLevel(owner);
    } else if (type === u.INDEX_FEATURE) {
      return store.findPartIndex(owner);
    }
    //try finding existing attribute
    let attributeUri = store.findAttributeUri(owner, type);
    if (attributeUri) {
      return attributeUri;
    }
    //try adding attribute if defined somewhere
    let typeOfType = store.findObject(type, u.TYPE);
    if (typeOfType === u.FEATURE_TYPE || store.isSubclassOf(typeOfType, u.FEATURE_TYPE)) {
      //not very useful, feature will be null forever
      return store.setFeature(owner, type);
    } else if (typeOfType === u.PARAMETER_TYPE || store.isSubclassOf(typeOfType, u.PARAMETER_TYPE)) {
      return store.setParameter(owner, type);
    }
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