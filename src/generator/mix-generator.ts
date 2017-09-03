import * as _ from 'lodash';
import { DymoGenerator } from './dymo-generator';
import { DymoStore } from '../io/dymostore';

export class MixGenerator {

  private mixDymoUri: string;
  private store: DymoStore;

  constructor(private generator: DymoGenerator) {
    this.store = this.generator.getStore();
  }

  transitionToSong(songDymoUri: string, durationInBars: number): string {
    if (!this.mixDymoUri) {
      this.mixDymoUri = this.generator.addDymo();
    }
    let songParts = this.store.findParts(songDymoUri);
    let randomBar = _.random(songParts.length-durationInBars);
    console.log(randomBar)
    songParts.slice(randomBar, randomBar+durationInBars).forEach(p => this.store.addPart(this.mixDymoUri, p));
    return this.mixDymoUri;
  }

}