import * as _ from 'lodash';
import * as math from 'mathjs';
import * as arrays from 'arrayutils';
import { VALUE } from '../globals/uris';
import { EasyStore } from '../io/easystore';
import { MathjsNode } from '../globals/mathjs-types';
import { LogicTools } from '../math/logictools';

interface MathjsCompiled {
  eval: Function
}

export class Maintainer {

  private logicjsGoalFunction: Function;
  private mathjsCompiledExpression: MathjsCompiled;
  private urisAndVars: Map<string,string[]> = new Map<string,string[]>();
  private allVarNames: string[] = [];
  private currentValues: {} = {};
  private featureVars: string[];

  constructor(private varsAndUris: Map<string,string>, private expression: MathjsNode, isDirected: boolean, private store: EasyStore) {
    //console.log(expression.toString())
    varsAndUris.forEach((u,v) => this.setUriAndVar(u,v));
    varsAndUris.forEach((uri,varName) => {
      store.addValueObserver(uri, VALUE, this);
      this.updateVar(varName, uri);
      this.allVarNames.push(varName);
    });
    //TODO ADD JS
    if (isDirected) {
      this.mathjsCompiledExpression = this.expression.args[1].compile();
    } else {
      this.logicjsGoalFunction = LogicTools.createGoalFunction(this.expression);
      if (!this.logicjsGoalFunction && this.checkIfFunctionPossible(this.expression)) {
        this.mathjsCompiledExpression = this.expression.args[1].compile();
      }
    }
    this.maintain();
  }

  private checkIfFunctionPossible(mathjsTree: MathjsNode): boolean {
    return mathjsTree.isOperatorNode && mathjsTree["fn"] === "equal"
      && (mathjsTree["args"][0].isSymbolNode || mathjsTree["args"][0].isFunctionNode);
  }

  private setUriAndVar(uri: string, variable: string) {
    let presentVars = this.urisAndVars.get(uri);
    if (!this.urisAndVars.get(uri)) {
      presentVars = [];
      this.urisAndVars.set(uri, presentVars);
    }
    presentVars.push(variable);
  }

  private maintain(changedVars?: string[]) {
    let defVarNames = _.keys(this.currentValues).sort();
    let undefVars = _.difference(this.allVarNames, defVarNames);
    //console.log(this.currentValues, undefVars, this.expression.toString())
    if (this.mathjsCompiledExpression
      //goalvar is the only still undefined var
      && ((undefVars.length === 1 && undefVars[0] === this.allVarNames[0])
        //all vars defined and changed vars dont contain goal var
        || (undefVars.length === 0 && (!changedVars || changedVars.indexOf(this.allVarNames[0]) < 0)))) {
      this.currentValues["Math"] = Math;
      this.currentValues["math"] = math;
      let newValue = this.mathjsCompiledExpression.eval(this.currentValues);
      this.store.setValue(this.varsAndUris.get(this.allVarNames[0]), VALUE, newValue);
      //console.log("SET", this.varsAndUris.get(this.allVarNames[0]), VALUE, newValue)
    } else if (this.logicjsGoalFunction) {
      let values = defVarNames.map(n => this.currentValues[n]);
      let index;
      if (undefVars.length > 1) {
        //too many undefined variables, abort
        return;
      } else if (undefVars.length == 1) {
        //one variable still undefined, solve for that
        index = this.allVarNames.indexOf(undefVars[0]);
        //add dummy to value list
        values.splice(index, 0, null);
      } else {
        //solve for one of the unchanged vars
        index = this.getIndexOfLeastObserved(this.allVarNames, changedVars);
      }
      let solutions = LogicTools.solveConstraint(this.logicjsGoalFunction, _.clone(values), index);
      //only update if changed
      if (solutions.indexOf(values[index]) < 0) {
        this.store.setValue(this.varsAndUris.get(this.allVarNames[index]), VALUE, solutions[0]);
      }
    }
  }

  private getRandomIndex<T>(array: T[], ignoredElements?: T[]): number {
    let indices = _.range(0, array.length);
    if (ignoredElements) {
      ignoredElements.forEach(e => indices.splice(array.indexOf(e), 1));
    }
    return _.sample(indices);
  }

  private getIndexOfLeastObserved<T>(array: T[], ignoredElements?: T[]): number {
    let indices = _.range(0, array.length);
    if (ignoredElements) {
      ignoredElements.forEach(e => indices.splice(array.indexOf(e), 1));
    }
    let observerCounts = indices.map(i => this.store.getValueObservers(this.varsAndUris.get(this.allVarNames[i]), VALUE).length);
    //TODO IF SEVERAL ONES EQUAL: CHOOSE AT RANDOM
    let indexOfLeastObserved = arrays.indexOfMax(observerCounts.map(c => -c));
    return indices[indexOfLeastObserved];
  }

  private updateVar(varName: string, uri: string) {
    let foundValue = this.store.findObjectValue(uri, VALUE);
    if (foundValue != null) {
      this.currentValues[varName] = this.store.findObjectValue(uri, VALUE);
    }
  }

  observedValueChanged(uri: string, type: string, value: number | string) {
    //console.log(this.expression.toString(), uri, type, value)
    let changedVars = this.urisAndVars.get(uri);
    if (changedVars && !this.closeTo(<number>value, this.currentValues[changedVars[0]], 1000000)) {//arbitrarily set precision
      changedVars.forEach(v => this.currentValues[v] = value);
      this.maintain(changedVars);
    }
  }

  private closeTo(a: number, b: number, precisionFactor: number): boolean {
    return Math.round(a*precisionFactor) == Math.round(b*precisionFactor);
  }

  stop() {
    this.varsAndUris.forEach((u,v) => this.store.removeValueObserver(u, VALUE, this));
  }

}