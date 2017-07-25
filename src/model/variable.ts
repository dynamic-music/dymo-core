import * as math from 'mathjs';
import * as _ from 'lodash';
import * as u from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { Expression } from '../model/expression';

export abstract class BoundVariable {

  constructor(protected name: string) {}

  getName(): string {
    return this.name;
  }

  abstract getValues(store: DymoStore): string[];

  toString(): string {
    return '∀ ' + this.name;
  }

}

export class TypedVariable extends BoundVariable {

  constructor(name: string, protected type: string) {
    super(name);
  }

  getType(): string {
    return this.type;
  }

  getValues(store: DymoStore): string[] {
    return store.findAllSubjects(u.TYPE, this.type);
  }

  toString(): string {
    return super.toString() + ' : ' + this.type;
  }

}

export class ExpressionVariable extends TypedVariable {

  constructor(name: string, type: string, private typeExpression: Expression) {
    super(name, type);
  }

  getTypeExpression(): Expression {
    return this.typeExpression;
  }

  getValues(store: DymoStore): string[] {
    let values = super.getValues(store);
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
    return super.toString() + ', ' + this.typeExpression.toString();
  }

}

export class SetBasedVariable extends BoundVariable {

  constructor(name: string, private set: string[]) {
    super(name);
  }

  getSet(): string[] {
    return this.set;
  }

  getValues(store: DymoStore): string[] {
    return this.set.filter(u => store.find(u));
  }

  toString(): string {
    return super.toString() + ' in ' + this.set.toString();
  }

}
