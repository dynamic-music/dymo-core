import * as _ from 'lodash';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';

export abstract class Navigator {

  protected playCount = 0;
  protected parts: string[];

  constructor(protected dymoUri: string, protected store: DymoStore) {
    //TODO MAKE PARTS REALTIME TOO, GET THEM EVERYTIME NEXT IS CALLED....
    this.parts = this.store.findParts(this.dymoUri);
  }

  hasParts(): boolean {
    return this.parts.length > 0;
  }

  abstract next(): string[];

  protected keepPlaying(): boolean {
    let keepPlaying = !this.playCount || this.isLoop()
        || this.repetitions() > this.playCount;
    return keepPlaying;
  }

  protected isLoop(): boolean {
    return this.store.findParameterValue(this.dymoUri, uris.LOOP) || false;
  }

  protected repetitions(): number {
    return this.store.findParameterValue(this.dymoUri, uris.REPEAT) || 0;
  }

  protected toArray(s: string): string[] {
    return s ? [s] : undefined;
  }

}

export abstract class IndexedNavigator extends Navigator {

  protected currentIndex;

  constructor(protected dymoUri: string, protected store: DymoStore) {
    super(dymoUri, store);
    this.reset();
  }

  next() {
    //check if another pass appropriate
    if (this.currentIndex == this.parts.length && this.keepPlaying()) {
      this.reset();
    }
    //first next of pass
    if (this.currentIndex == 0) {
      this.playCount++;
    }
    return this.get();
  }

  /** override for any non-index-based reset operation */
  protected reset() {
    this.currentIndex = 0;
  }

  protected abstract get(): string[];

}

export class SequentialNavigator extends IndexedNavigator {

  get() {
    return this.toArray(this.parts[this.currentIndex++]);
  }

}

export class ReverseSequentialNavigator extends IndexedNavigator {

  get() {
    let reverseIndex = this.parts.length-1 - this.currentIndex++;
    return this.toArray(this.parts[reverseIndex]);
  }

}

export class PermutationNavigator extends IndexedNavigator {

  private permutedIndices: number[];

  reset() {
    super.reset();
    this.permutedIndices = _.shuffle(_.range(this.parts.length));
  }

  get() {
    return this.toArray(this.parts[this.permutedIndices[this.currentIndex++]]);
  }

}

export abstract class OneshotNavigator extends Navigator {

  next() {
    if (this.keepPlaying()) {
      this.playCount++;
      return this.get();
    }
  }

  abstract get(): string[];

}

export class LeafNavigator extends OneshotNavigator {

  get() {
    return this.toArray(this.dymoUri);
  }

}

export class ConjunctionNavigator extends OneshotNavigator {

  get() {
    return this.parts;
  }

}

export class DisjunctionNavigator extends OneshotNavigator {

  get() {
    return this.toArray(this.parts[_.random(this.parts.length)]);
  }

}



export function getNavigator(dymoUri: string, store: DymoStore): Navigator {
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
  let dymoType = store.findObject(dymoUri, uris.TYPE);
  if (dymoType === uris.CONJUNCTION) {
    return new ConjunctionNavigator(dymoUri, store);
  } else if (dymoType === uris.DISJUNCTION) {
    return new DisjunctionNavigator(dymoUri, store);
  } else if (store.findParts(dymoUri).length > 0) {
    return new SequentialNavigator(dymoUri, store);
  } else {
    return new LeafNavigator(dymoUri, store);
  }
}

