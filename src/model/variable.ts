import * as math from 'mathjs';
import * as _ from 'lodash';
import * as u from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { Expression } from '../model/expression';

export class BoundVariable {

  constructor(private name: string, private type: string, private typeExpression?: Expression) {}

  getName(): string {
    return this.name;
  }

  getType(): string {
    return this.type;
  }

  getTypeExpression(): Expression {
    return this.typeExpression;
  }

  getValues(store: DymoStore): string[] {
    let values = store.findAllSubjects(u.TYPE, this.type);
    if (this.typeExpression) {
      values = values.filter(d => this.typeExpression.evaluate(this.createVarsObject(d), store))
    }
    return values;
  }

  private createVarsObject(dymoUri) {
    let vars = {};
    vars[this.name] = dymoUri;
    return vars;
  }

  toString(): string {
    let expressionString = this.typeExpression ? ', ' + this.typeExpression.toString() : '';
    return '∀ ' + this.name + ' : ' + this.type + expressionString;
  }

}
