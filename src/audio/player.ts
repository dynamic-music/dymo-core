import * as _ from 'lodash';
import { Schedulo, Time, Playback } from 'schedulo';
import * as uris from '../globals/uris';
import { ScheduloObjectWrapper } from '../audio/wrapper';
import { Navigator, getNavigator } from '../navigators/nav';
import { DymoStore } from '../io/dymostore';

function schedule(dymoUri: string, previousObject: ScheduloObjectWrapper,
    store: DymoStore, scheduler: Schedulo): Promise<ScheduloObjectWrapper> {

  /*if (!dymoUri) return Promise.reject('no dymoUri given');

  let referenceTime = previousObject ? previousObject.getReferenceTime()
    : this.scheduler.getSchedulo().getCurrentTime()+0.5;
  let onset = this.store.findParameterValue(dymoUri, uris.ONSET);
  let startTime;
  if (!isNaN(onset)) {
    startTime = Time.At(referenceTime+onset);
  } else if (previousObject) {
    startTime = Time.After([previousObject.getScheduloObject()]);
  } else {
    startTime = Time.At(referenceTime);
  }
  let segment = this.calculateSegment(dymoUri);

  return scheduler.scheduleAudio(
    [this.store.getSourcePath(dymoUri)],
    startTime,
    Playback.Oneshot(segment[0], segment[1]),
    {
      bufferScheme: 'dynamic',
      timings: {
        connectToGraph: {countIn: 2, countOut: 2},
        loadBuffer: {countIn: 5, countOut: 5}
      }
    }
  ).then(audioObject => new Promise(resolve => {
    console.log("GOT AUDIOOBJ")
    let newObject = new ScheduloObjectWrapper(dymoUri, referenceTime, audioObject[0], this.store, this);
    newObject.getScheduloObject().on('scheduled', ()=>{
      console.log("SCHEDULED")
      resolve(newObject);
    });
  }));*/
  console.log("scheduled", dymoUri)
  return Promise.resolve(new ScheduloObjectWrapper(dymoUri, 0, null, store, null));
}

function calculateSegment(dymoUri: string): [number, number] {
  let start = this.store.findFeatureValue(this.dymoUri, uris.TIME_FEATURE);
  start = start ? start : 0;
  let durationF = this.store.findFeatureValue(this.dymoUri, uris.DURATION_FEATURE);
  let durationP = this.store.findParameterValue(this.dymoUri, uris.DURATION);
  let duration = durationP ? durationP : durationF;
  //TODO ONLY WORKS IF DURATION PARAM OR FEATURE GIVEN (DELEGATE TO SCHEDULO!!!!!)
  let durationRatio = this.store.findParameterValue(this.dymoUri, uris.DURATION_RATIO);
  if (durationRatio && duration) {
    duration *= durationRatio;
  }
  return [start, duration];
}

export interface PlayerObserver {
  objectStarted: (object: ScheduloObjectWrapper) => void,
  objectEnded: (object: ScheduloObjectWrapper) => void,
  lastObjectScheduled: (object: ScheduloObjectWrapper) => void
}

/*export class PlayerManager implements PlayerObserver {
  objectStarted(object: ScheduloObjectWrapper): void {}
  objectEnded(object: ScheduloObjectWrapper): void {}
  lastObjectScheduled: (object: ScheduloObjectWrapper) => void
}*/




export class DymoPlayer implements PlayerObserver {

  private navigator: Navigator;
  private scheduledObjects: ScheduloObjectWrapper[] = [];
  private playingObjects: ScheduloObjectWrapper[] = [];
  private partPlayers: DymoPlayer[] = [];
  private ended: boolean;

  constructor(private dymoUri: string, private parent: DymoPlayer,
    private store: DymoStore, private scheduler: Schedulo
  ) {}

  hasEnded() {
    return this.ended;
  }

  getLastScheduledObject() {
    return _.last(this.scheduledObjects);
  }

  lastObjectScheduled() {

  }

  partPlayerEnded(player: DymoPlayer) {
    let lastObject = player.getLastScheduledObject();
    if (this.partPlayers.every(p => p.hasEnded())) {

    }
    //ONCE ALL PLAYERS DONE:
    //find which of the objects predicted to play longest
    //override with this object if there is one!
    //send schedulo object to observer so that schedule.after can be called
  }

  /** returns the last object scheduled before this player is done */
  play(): Promise<ScheduloObjectWrapper> {
    return this.recursivePlay();
  }

  private recursivePlay(): Promise<ScheduloObjectWrapper> {
    //PLAY AND OBSERVE MAIN DURATION ... should override part players...
    //THEN MAKE PLAYER FOR NAVIGATED PART IF THERE IS ONE
    if (!this.navigator) {
      this.navigator = getNavigator(this.dymoUri, this.store);
    }
    let next = this.navigator.next();
    console.log(next);

    if (this.navigator.hasParts()) {
      if (next) {
        this.partPlayers = next
          .map(p => new DymoPlayer(p, this, this.store, this.scheduler));
        return Promise.all(this.partPlayers.map(p => p.play()))
          .then(() => this.recursivePlay())
      } else {
        this.ended = true;
        let lastObjects = this.partPlayers.map(p => p.getLastScheduledObject());
        lastObjects.sort((a,b) => a.getParam(uris.DURATION) - b.getParam(uris.DURATION))
        return Promise.resolve(_.last(lastObjects));
        //this.parent.partPlayerEnded(this);
      }
    } else {
      if (next) {
        //only schedule audio if this has no parts
        return Promise.all(next.map(p =>
            schedule(p, _.last(this.scheduledObjects), this.store, this.scheduler))
          )
          .then(os => this.scheduledObjects = this.scheduledObjects.concat(os))
          .then(() => this.recursivePlay())
          .catch(); //DONE
      } else {
        return Promise.resolve(_.last(this.scheduledObjects));
      }
    }
  }

  getPlayingDymoUris(): string[] {
    return _.flatten(this.playingObjects.map(o => o.getUris()));
  }

  objectStarted(object: ScheduloObjectWrapper) {
    this.playingObjects.push(object);
    //TODO this.scheduler.objectStarted(object.getUris());
  }

  objectEnded(object: ScheduloObjectWrapper) {
    this.removeFrom(object, this.scheduledObjects);
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

  stop() {
    this.scheduledObjects.forEach(o => o.stop());
  }

}




//USE CASES
//sequence where parent and children have audio
//sequence with varying main duration



//looping file


//looping conjunction of two looping files


