import * as _ from 'lodash';
import { Time } from 'schedulo';
import * as uris from '../globals/uris';
import { SuperDymoStore } from '../globals/types';

export interface SchedulingInstructions {
  uris: string[],
  initRefTime?: boolean,
  time?: Time
}

export abstract class Navigator {

  protected playCount = 0;
  protected parts: string[];

  constructor(protected dymoUri: string, protected store: SuperDymoStore) {}

  async hasParts(): Promise<boolean> {
    return (await this.store.findParts(this.dymoUri)).length > 0;
  }

  async next(): Promise<SchedulingInstructions> {
    this.parts = await this.store.findParts(this.dymoUri);
    return undefined;
  }

  abstract getPosition(): number;

  protected async keepPlaying(): Promise<boolean> {
    let keepPlaying = !this.playCount || await this.isLoop()
        || await this.repetitions() > this.playCount;
    return keepPlaying;
  }

  private async isLoop(): Promise<boolean> {
    return await this.store.findParameterValue(this.dymoUri, uris.LOOP) || false;
  }

  private async repetitions(): Promise<number> {
    return await this.store.findParameterValue(this.dymoUri, uris.REPEAT) || 0;
  }

  protected toArray(s: string): string[] {
    return s ? [s] : undefined;
  }

}

export abstract class IndexedNavigator extends Navigator {

  protected currentIndex;

  constructor(dymoUri: string, store: SuperDymoStore) {
    super(dymoUri, store);
    this.reset();
  }

  async next() {
    await super.next();
    //check if another pass appropriate
    if (this.currentIndex == this.parts.length && await this.keepPlaying()) {
      this.reset();
    }
    //first next of pass
    if (this.currentIndex == 0) {
      this.playCount++;
    }
    return Promise.resolve(this.get());
  }

  getPosition(): number {
    return this.currentIndex;
  }

  /** override for any non-index-based reset operation */
  protected reset() {
    this.currentIndex = 0;
  }

  protected abstract get(): SchedulingInstructions;

}

export class SequentialNavigator extends IndexedNavigator {

  get() {
    return { uris: this.toArray(this.parts[this.currentIndex++]) };
  }

}

export class ReverseSequentialNavigator extends IndexedNavigator {

  get() {
    let reverseIndex = this.parts.length-1 - this.currentIndex++;
    return { uris: this.toArray(this.parts[reverseIndex]) };
  }

}

export class PermutationNavigator extends IndexedNavigator {

  private permutedIndices: number[];

  reset() {
    super.reset();
    this.permutedIndices = _.shuffle(_.range(this.parts.length));
  }

  get() {
    return {
      uris: this.toArray(this.parts[this.permutedIndices[this.currentIndex++]])
    };
  }

}

export class OnsetNavigator extends SequentialNavigator {

  get() {
    const init = this.currentIndex === 0;
    const superget = super.get();
    return { uris : superget.uris, initRefTime: init }
  }

}

export abstract class OneshotNavigator extends Navigator {

  async next() {
    await super.next();
    if (await this.keepPlaying()) {
      this.playCount++;
      return Promise.resolve(this.get());
    }
  }

  abstract get(): SchedulingInstructions;

}

export class LeafNavigator extends OneshotNavigator {

  get() {
    return { uris: this.toArray(this.dymoUri) };
  }

  getPosition() {
    return 0;
  }

}

export class ConjunctionNavigator extends OneshotNavigator {

  get() {
    return { uris: this.parts };
  }

  getPosition() {
    return 0;
  }

}

export class DisjunctionNavigator extends OneshotNavigator {

  get() {
    return { uris: this.toArray(this.parts[_.random(this.parts.length)]) };
  }

  getPosition() {
    return 0;
  }

}



export async function getNavigator(dymoUri: string, store: SuperDymoStore): Promise<Navigator> {
  /*for (var subset of this.subsetNavigators.keys()) {
    if (subset.getValues(this.store).indexOf(dymoUri) >= 0) {
      return this.subsetNavigators.get(subset).getCopy(dymoUri, this.getNavigator.bind(this));
    }
  }
  if (dymoUri && this.defaultSubsetNavigator) { //&& DYMO_STORE.findParts(dymoUri).length > 0) {
    return this.defaultSubsetNavigator.getCopy(dymoUri, this.getNavigator.bind(this));
  } else {
    return new OneShotNavigator(dymoUri);
  }*/
  let dymoType = await store.findObject(dymoUri, uris.CDT);
  let parts = await store.findParts(dymoUri);
  if (dymoType === uris.CONJUNCTION) {
    return new ConjunctionNavigator(dymoUri, store);
  } else if (dymoType === uris.DISJUNCTION) {
    return new DisjunctionNavigator(dymoUri, store);
  } else if (parts.length > 0) {
    if (await store.findParameterValue(parts[0], uris.ONSET) != null) {
      return new OnsetNavigator(dymoUri, store);
    }
    return new SequentialNavigator(dymoUri, store);
  } else {
    return new LeafNavigator(dymoUri, store);
  }
}

