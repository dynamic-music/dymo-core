import * as math from 'mathjs';
import { DymoStore } from '../io/dymostore';
import { BoundVariable, SetBasedVariable, TypedVariable } from './variable';
import { Expression } from './expression';

/**
 *
 */
export class Constraint {

  constructor(private vars: BoundVariable[], private expression: Expression) {}

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

export function forAll(
  varName: string,
  state: BoundVariable[] = []
): IntermediateQuantifier {
  return new IntermediateQuantifier(varName, state);
}

class IntermediateQuantifier {

  constructor(public name: string, private state: BoundVariable[] = []) {}
  
  in(...validDomain: string[]): ScopedIntermediateQuantifier {
    return new ScopedIntermediateQuantifier(
      new SetBasedVariable(this.name, validDomain),
      this.state
    );
  }

  ofType(uri: string): ScopedIntermediateQuantifier {
    return new ScopedIntermediateQuantifier(
      new TypedVariable(this.name, uri),
      this.state
    );
  }
}

class ScopedIntermediateQuantifier {
  private state: BoundVariable[]; // probably ought to be a tree

  constructor(domain: BoundVariable, stateSoFar: BoundVariable[] = []) {
    this.state = [
      ...stateSoFar,
      domain
    ];
  }

  forAll(varName: string): IntermediateQuantifier {
    return forAll(varName, this.state);
  }

  assert(exp: string, isDirected = true): Constraint {
    return new Constraint(this.state, new Expression(exp, isDirected));
  }
}
