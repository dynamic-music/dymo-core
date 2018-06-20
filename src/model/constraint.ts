import * as math from 'mathjs';
import { ConstraintGhost } from '../globals/types';
import { DymoStore } from '../io/dymostore';
import { BoundVariable } from './variable';
import { Expression } from './expression';

/**
 *
 */
export class Constraint implements ConstraintGhost {

  constructor(public vars: BoundVariable[], public expression: Expression) {}

  evaluate(store: DymoStore) {
    let vals = this.vars.map(v => v.getValues(store));
    let combos = this.cartesianProduct(vals);
    return combos.map(c => {
      let varsAndVals = {};
      this.vars.forEach((v,i) => varsAndVals[v.getName()] = c[i]);
      return this.expression.evaluate(varsAndVals, store);
    })
  }

  maintain(store: DymoStore) {
    let vals = this.vars.map(v => v.getValues(store));
    let combos = this.cartesianProduct(vals);
    combos.forEach(c => {
      let varsAndVals = {};
      this.vars.forEach((v,i) => varsAndVals[v.getName()] = c[i]);
      this.expression.maintain(varsAndVals, store);
    });
  }

  stopMaintaining() {
    this.expression.stopMaintaining();
  }

  private cartesianProduct(arr: any[]): any[] {
    return arr.reduce((a, b) =>
      a.map(x => b.map(y => x.concat(y)))
      .reduce((a, b) => a.concat(b), []), [[]]);
  }

  getBoundVariables(): BoundVariable[] {
    return this.vars;
  }

  getExpression(): Expression {
    return this.expression;
  }

  toString(): string {
    return this.vars.map(v => v.toString()).join(' => ') + ' => ' + this.expression.toString();
  }

}
