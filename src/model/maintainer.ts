import * as _ from 'lodash';
import * as math from 'mathjs';
import { VALUE } from '../globals/uris';
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
  private allVarNames: string[] = [];
  private currentValues: {} = {};
  private featureVars: string[];

  constructor(private varsAndUris: Map<string,string>, private expression: MathjsNode, isDirectional: boolean, private store: DymoStore) {
    //console.log(expression.toString())
    varsAndUris.forEach((u,v) => this.setUriAndVar(u,v));
    varsAndUris.forEach((uri,varName) => {
      store.addValueObserver(uri, VALUE, this);
      this.updateVar(varName, uri);
      this.allVarNames.push(varName);
    });
    if (isDirectional) {
      this.mathjsCompiledExpression = this.expression.args[1].compile();
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
    let defVarNames = _.keys(this.currentValues);
    let values = _.values(this.currentValues);
    let undefVars = _.difference(this.allVarNames, defVarNames);
    //console.log(this.currentValues, undefVars, this.expression.toString())
    if (this.mathjsCompiledExpression
      //goalvar is the only still undefined var
      && ((undefVars.length === 1 && undefVars[0] === this.allVarNames[0])
        //all vars defined and changed vars dont contain goal var
        || (undefVars.length === 0 && (!changedVars || changedVars.indexOf(this.allVarNames[0]) < 0)))) {
      let newValue = this.mathjsCompiledExpression.eval(this.currentValues);
      //console.log(newValue, this.expression.toString(), this.currentValues)
      this.store.setValue(this.varsAndUris.get(this.allVarNames[0]), VALUE, newValue);
      //console.log(this.varsAndUris, this.allVarNames[0])
    } else if (this.logicjsGoalFunction) {
      let index;
      if (undefVars.length === 1) {
        //one variable still undefined, solve for that
        index = this.allVarNames.indexOf(undefVars[0]);
      } else {
        //solve for one of the unchanged vars
        index = this.getRandomIndex(this.allVarNames, changedVars);
      }
      let newValue = LogicTools.solveConstraint(this.logicjsGoalFunction, values, index);
      this.store.setValue(this.varsAndUris.get(this.allVarNames[index]), VALUE, newValue);
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