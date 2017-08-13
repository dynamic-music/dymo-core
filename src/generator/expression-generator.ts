import * as _ from 'lodash';
import { DymoStore } from '../io/dymostore';
import { ConstraintWriter } from '../io/constraintwriter';
import { BoundVariable, TypedVariable, SetBasedVariable, ExpressionVariable } from '../model/variable';
import { Constraint } from '../model/constraint';
import { Expression } from '../model/expression';

export class ExpressionGenerator {

  private writer: ConstraintWriter;

  constructor(store: DymoStore) {
    this.writer = new ConstraintWriter(store);
  }

  addVariable(expression: string): string {
    return this.writer.addVariable(this.parseVar(expression));
  }

  addConstraint(ownerUri: string, expression: string, isFunction = false): string {
    let parts = expression.split('=>');
    let vars = _.initial(parts).map(v => this.parseVar(v));
    let exp = new Expression(_.trim(_.last(parts)), isFunction);
    return this.writer.addConstraint(ownerUri, new Constraint(vars, exp));
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