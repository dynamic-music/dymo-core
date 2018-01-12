import * as _ from 'lodash';
import * as natsort from 'natsort';
import * as uris from '../globals/uris';
import { Navigator, getNavigator } from '../navigators/nav';
import { DymoStore } from '../io/dymostore';
import { DymoScheduler, ScheduledObject } from '../audio/scheduler';

export class DymoPlayer {

  private currentPlayers = new Map<string,HierarchicalPlayer>();
  private playingObjects: ScheduledObject[] = [];

  constructor(private store: DymoStore, private scheduler: DymoScheduler) {
    scheduler.setPlayer(this);
  }

  getStore(): DymoStore {
    return this.store;
  }

  play(dymoUri: string): Promise<any> {
    let newPlayer = new HierarchicalPlayer(dymoUri, this.store, this.scheduler);
    this.currentPlayers.set(dymoUri, newPlayer);
    return newPlayer.play();
  }

  stop(dymoUri?: string) {
    if (dymoUri) {
      this.currentPlayers.get(dymoUri).stop();
      this.currentPlayers.delete(dymoUri);
    } else {
      Array.from(this.currentPlayers.values()).forEach(p => p.stop());
      this.currentPlayers = new Map<string,HierarchicalPlayer>();
    }
  }

  getPlayingDymoUris(): string[] {
    let uris = _.uniq(_.flatten(this.playingObjects.map(o => o.getUris())));
    uris.sort(natsort());
    return uris;
  }

  objectStarted(object: ScheduledObject) {
    this.playingObjects.push(object);
    //TODO this.scheduler.objectStarted(object.getUris());
  }

  objectEnded(object: ScheduledObject) {
    if (this.removeFrom(object, this.playingObjects)) {
      //TODO this.scheduler.objectStopped();
    }
  }

  private removeFrom<T>(element: T, list: T[]): boolean {
    let index = list.indexOf(element);
    if (index >= 0) {
      list.splice(index, 1);
      return true;
    }
    return false;
  }

}

export class HierarchicalPlayer {

  private navigator: Navigator;
  private scheduledObjects: ScheduledObject[] = [];
  private partPlayers: HierarchicalPlayer[] = [];

  constructor(private dymoUri: string, private store: DymoStore,
    private scheduler: DymoScheduler
  ) {}

  getLastScheduledObject() {
    return _.last(this.scheduledObjects);
  }

  /** returns the last object scheduled before this player is done */
  play(): Promise<ScheduledObject> {
    return this.recursivePlay();
  }

  stop() {
    this.scheduledObjects.forEach(o => o.stop());
  }

  private recursivePlay(): Promise<ScheduledObject> {
    //TODO PLAY AND OBSERVE MAIN DURATION ... should override part players...
    //THEN MAKE PLAYER FOR NAVIGATED PART IF THERE IS ONE
    if (!this.navigator) {
      this.navigator = getNavigator(this.dymoUri, this.store);
    }
    let next = this.navigator.next();
    //console.log(next);

    if (this.navigator.hasParts()) {
      if (next) {
        this.partPlayers = next
          .map(p => new HierarchicalPlayer(p, this.store, this.scheduler));
        return Promise.all(this.partPlayers.map(p => p.play()))
          .then(() => this.recursivePlay())
      } else {
        //for now return the currently longest of the last scheduled objects
        /*TODO could be improved once schedulo permits scheduling after group
          of objects with variable duration!*/
        /*TODO also, override with this duration if there is one! (e.g. sequence
          with a variable duration regardless of its parts' durations)*/
        let lastObjects = this.partPlayers.map(p => p.getLastScheduledObject());
        lastObjects.sort((a,b) => a.getParam(uris.DURATION) - b.getParam(uris.DURATION));
        return Promise.resolve(_.last(lastObjects));
      }
    } else {
      if (next) {
        //only schedule audio if this has no parts
        return Promise.all(next.map(p =>
            this.scheduler.schedule(p, _.last(this.scheduledObjects)))
          )
          .then(os => this.scheduledObjects = this.scheduledObjects.concat(os))
          .then(() => this.recursivePlay())
          .catch(); //DONE
      } else {
        return Promise.resolve(_.last(this.scheduledObjects));
      }
    }
  }

}




//USE CASES
//sequence where parent and children have audio
//sequence with varying main duration



//looping file


//looping conjunction of two looping files


