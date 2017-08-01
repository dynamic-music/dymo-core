import * as _ from 'lodash';
import * as math from 'mathjs';
import { VALUE } from '../../src/globals/uris';
import { DymoStore } from '../io/dymostore';
import { MathjsNode } from '../globals/types';
import { LogicTools } from '../math/logictools';

interface MathjsCompiled {
  eval: Function
}

export class Maintainer {

  private logicjsGoalFunction: Function;
  private mathjsCompiledExpression: MathjsCompiled;
  private urisAndVars: Map<string,string[]> = new Map<string,string[]>();
  private currentValues: {} = {};
  private featureVars: string[];

  constructor(private varsAndUris: Map<string,string>, private expression: MathjsNode, isFunction: boolean, private store: DymoStore) {
    varsAndUris.forEach((u,v) => this.setUriAndVar(u,v));
    varsAndUris.forEach((uri,varName) => {
      store.addValueObserver(uri, VALUE, this);
      this.updateVar(varName, uri);
    });
    if (isFunction) {
      this.mathjsCompiledExpression = this.expression["args"][1].compile();
    } else {
      this.logicjsGoalFunction = LogicTools.createGoalFunction(this.expression);
    }
    this.maintain();
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
    //only maintain if all values defined
    if (_.keys(this.currentValues).length === this.varsAndUris.size) {
      let varNames = _.keys(this.currentValues);
      let values = _.values(this.currentValues);
      if (this.mathjsCompiledExpression && (!changedVars || changedVars.length == 1 || changedVars.indexOf(varNames[0]) < 0)) {
        let newValue = this.mathjsCompiledExpression.eval(this.currentValues);
        this.store.setValue(this.varsAndUris.get(varNames[0]), VALUE, newValue);
      } else if (this.logicjsGoalFunction) {
        let index = this.getRandomIndex(varNames, changedVars);
        let newValue = LogicTools.solveConstraint(this.logicjsGoalFunction, values, index);
        this.store.setValue(this.varsAndUris.get(varNames[index]), VALUE, newValue);
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

  private updateVar(varName: string, uri: string) {
    let foundValue = this.store.findObjectValue(uri, VALUE);
    if (foundValue != null) {
      this.currentValues[varName] = this.store.findObjectValue(uri, VALUE);
    }
  }

  observedValueChanged(uri: string, type: string, value: number | string) {
    let changedVars = this.urisAndVars.get(uri);
    if (changedVars && value !== this.currentValues[changedVars[0]]) {
      changedVars.forEach(v => this.currentValues[v] = value);
      this.maintain(changedVars);
    }
  }

  stop() {
    this.varsAndUris.forEach(o => this.store.removeValueObserver(o, VALUE, this));
  }

}