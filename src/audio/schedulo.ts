import { Schedulo, Time, Playback } from 'schedulo';
import * as uris from '../globals/uris';
import { DymoScheduler } from './scheduler';
import { ScheduloScheduledObject } from './wrapper';

export class ScheduloScheduler extends DymoScheduler {

  private schedulo: Schedulo;

  constructor() {
    super();
    this.schedulo = new Schedulo();
    this.schedulo.start();
  }

  setListenerOrientation(posX, posY, posZ, forwX, forwY, forwZ) {
    //TODO SET ON SCHEDULO!!!
  }

  schedule(dymoUri: string, previousObject: ScheduloScheduledObject): Promise<ScheduloScheduledObject> {

    if (!dymoUri) return Promise.reject('no dymoUri given');

    let referenceTime = previousObject ? previousObject.getReferenceTime()
      : this.schedulo.getCurrentTime()+0.5;
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

    return this.schedulo.scheduleAudio(
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
      let newObject = new ScheduloScheduledObject(dymoUri, referenceTime, audioObject[0], this.store, this.player);
      newObject.getScheduloObject().on('scheduled', ()=>{
        console.log("SCHEDULED")
        resolve(newObject);
      });
    }));
  }
}