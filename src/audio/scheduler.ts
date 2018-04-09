import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { DymoPlayer } from './player';


export abstract class ScheduledObject {

  protected parentUris;

  constructor(protected dymoUri: string, protected store: DymoStore,
      protected player: DymoPlayer) {
    this.parentUris = store.findAllParents(this.dymoUri);
  }

  getUri(): string {
    return this.dymoUri;
  }

  getUris(): string[] {
    return [this.dymoUri].concat(this.parentUris);
  }

  abstract getParam(paramUri: string): number;

  abstract stop(): void;

}

export class DummyScheduledObject extends ScheduledObject {

  constructor(dymoUri: string, store: DymoStore, player: DymoPlayer,
      delay: number) {
    super(dymoUri, store, player);
    this.player.objectStarted(this);
    setTimeout(() => this.player.objectEnded(this), delay);
  }

  getParam(paramUri: string): number {
    return this.store.findParameterValue(this.dymoUri, paramUri);
  }

  stop() {
    this.player.objectEnded(this);
  }

}

export abstract class DymoScheduler {

  protected player: DymoPlayer;
  protected store: DymoStore;

  setPlayer(player: DymoPlayer) {
    this.player = player;
    this.store = player.getStore();
  }

  abstract setListenerOrientation(posX, posY, posZ, forwX, forwY, forwZ);

  abstract schedule(dymoUri: string, previousObject: ScheduledObject,
    initRefTime: boolean): Promise<ScheduledObject>;

}

export class DummyScheduler extends DymoScheduler {

  constructor(private delay: number) { super() }

  setListenerOrientation(posX, posY, posZ, forwX, forwY, forwZ) { }

  schedule(dymoUri: string, previousObject: ScheduledObject): Promise<ScheduledObject> {
    return new Promise(resolve =>
      setTimeout(() => {
        console.log("scheduled", dymoUri);
        resolve(new DummyScheduledObject(dymoUri, this.store, this.player, this.delay));
      }, this.delay)
    );
  }

}