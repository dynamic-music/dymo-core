import * as math from 'mathjs';
import * as _ from 'lodash';
import * as u from '../globals/uris';
import { DymoStore } from '../io/dymostore';
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

  private typeExpressions: Expression[] = [];

  constructor(name: string, type: string, ...typeExpressions: Expression[]) {
    super(name, type);
    this.typeExpressions = typeExpressions;
  }

  getTypeExpressions(): Expression[] {
    return this.typeExpressions;
  }

  getValues(store: DymoStore): string[] {
    let values = super.getValues(store);
    this.typeExpressions.forEach(e => values = values.filter(v => e.evaluate(this.createVarsObject(v), store)));
    return values;
  }

  private createVarsObject(dymoUri) {
    let vars = {};
    vars[this.name] = dymoUri;
    return vars;
  }

  toString(): string {
    return super.toString() + ', ' + this.typeExpressions.map(e => e.toString()).join(', ');
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
    return super.toString() + ' in ' + JSON.stringify(this.set);
  }

}
