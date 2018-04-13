import * as _ from 'lodash';
import { DymoStore } from '../io/dymostore-service';
import { BoundVariable, TypedVariable, SetBasedVariable, ExpressionVariable } from '../model/variable';
import { Constraint } from '../model/constraint';
import { Expression } from '../model/expression';

export class ExpressionGenerator {

  constructor(private store: DymoStore) {}

  addVariable(expression: string): Promise<string> {
    return this.store.addVariable(this.parseVar(expression));
  }

  addConstraint(ownerUri: string, expression: string, isDirected = false): Promise<string> {
    let parts = expression.split('=>');
    let vars = _.initial(parts).map(v => this.parseVar(v));
    let exp = new Expression(_.trim(_.last(parts)), isDirected);
    return this.store.addConstraint(ownerUri, new Constraint(vars, exp));
  }

  private parseVar(string: string): BoundVariable {
    if (string.indexOf(' : ') >= 0) {
      if (string.indexOf(', ') >= 0) {
        return this.parseExpressionVar(string);
      }
      return this.parseTypedVar(string);
    }
    return this.parseSetBasedVar(string);
  }

  private parseExpressionVar(string: string): ExpressionVariable {
    let parts = string.split(', ');
    let [name, type] = this.parseNameAndType(parts[0]);
    let expressions = _.tail(parts).map(p => new Expression(_.trim(p)));
    return new ExpressionVariable(name, type, ...expressions);
  }

  private parseTypedVar(string: string): TypedVariable {
    let [name, type] = this.parseNameAndType(string);
    return new TypedVariable(name, type);
  }

  private parseSetBasedVar(string: string): SetBasedVariable {
    let parts = string.split(' in ');
    let name = this.parseVarName(parts[0]);
    let set = JSON.parse(parts[1]);
    return new SetBasedVariable(name, set);
  }

  private parseNameAndType(string: string): string[] {
    let parts = string.split(' : ');
    let name = this.parseVarName(parts[0]);
    let type = _.trim(parts[1]);
    return [name, type];
  }

  private parseVarName(string: string): string {
    return _.trim(string.replace('∀', ''));
  }

}

export function forAll(
  varName: string,
  state: BoundVariable[] = []
): IntermediateQuantifier {
  return new IntermediateQuantifier(varName, state);
}

export class IntermediateQuantifier {

  constructor(public name: string, private state: BoundVariable[] = []) {}

  in(...domain: string[]): ScopedIntermediateQuantifier {
    return new ScopedIntermediateQuantifier(
      new SetBasedVariable(this.name, domain),
      this.state
    );
  }

  ofType(uri: string): ScopedIntermediateQuantifier {
    return new ScopedIntermediateQuantifier(
      new TypedVariable(this.name, uri),
      this.state
    );
  }

  ofTypeWith(typeUri: string, ...withExpression: string[]): ScopedIntermediateQuantifier {
    return new ScopedIntermediateQuantifier(
      new ExpressionVariable(
        this.name,
        typeUri,
        ...withExpression.map(e => new Expression(e)) // TODO what about direction?
      ),
      this.state
    )
  }
}

export class ScopedIntermediateQuantifier {
  private state: BoundVariable[];

  constructor(domain: BoundVariable, stateSoFar: BoundVariable[] = []) {
    this.state = [
      ...stateSoFar,
      domain
    ];
  }

  forAll(varName: string): IntermediateQuantifier {
    return forAll(varName, this.state);
  }

  assert(exp: string, isDirected = false): Constraint {
    return new Constraint(this.state, new Expression(exp, isDirected));
  }
}
