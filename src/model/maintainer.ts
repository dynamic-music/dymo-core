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
  private urisAndVars: Map<string,string> = new Map<string,string>();
  private currentValues: {} = {};

  constructor(private varsAndUris: Map<string,string>, private expression: MathjsNode, isFunction: boolean, private store: DymoStore) {
    varsAndUris.forEach((u,v) => this.urisAndVars.set(u,v));
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

  private maintain(changedVar?: string) {
    //only maintain if all values defined
    if (_.keys(this.currentValues).length === this.urisAndVars.size) {
      let varNames = _.keys(this.currentValues);
      let values = _.values(this.currentValues);
      //TODO ALSO REMOVE FEATURES FROM OPTIONS!!!
      let index, newValue;
      if (this.mathjsCompiledExpression) {
        index = 0;
        newValue = this.mathjsCompiledExpression.eval(this.currentValues);
      } else if (this.logicjsGoalFunction) {
        index = this.getRandomIndex(varNames, changedVar);
        newValue = LogicTools.solveConstraint(this.logicjsGoalFunction, values, index);
      }
      this.store.setValue(this.varsAndUris.get(varNames[index]), VALUE, newValue);
    }
  }

  private getRandomIndex<T>(array: T[], ignoredElement?: T): number {
    let indices = _.range(0, array.length);
    if (ignoredElement) {
      indices.splice(array.indexOf(ignoredElement), 1);
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
    let changedVar = this.urisAndVars.get(uri);
    if (changedVar && value !== this.currentValues[changedVar]) {
      this.currentValues[changedVar] = value;
      this.maintain(changedVar);
    }
  }

  stop() {
    this.varsAndUris.forEach(o => this.store.removeValueObserver(o, VALUE, this));
  }

}