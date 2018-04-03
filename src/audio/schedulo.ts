import { Schedulo, Time, Playback, AudioBank } from 'schedulo';
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

  getAudioBank(): any {
    return this.schedulo.getAudioBank();
  }

  schedule(dymoUri: string, previousObject: ScheduloScheduledObject,
      initRefTime: boolean): Promise<ScheduloScheduledObject> {

    if (!dymoUri) return Promise.reject('no dymoUri given');

    let referenceTime;
    if (previousObject && initRefTime) {
      referenceTime = previousObject.getEndTime();
    } else if (previousObject) {
      referenceTime = previousObject.getReferenceTime();
    } else {
      referenceTime = this.schedulo.getCurrentTime()+0.5;
    }

    let newObject = new ScheduloScheduledObject(dymoUri, referenceTime, this.store, this.player);

    let startTime;
    let onset = newObject.getParam(uris.ONSET);
    if (!isNaN(onset)) {
      startTime = Time.At(onset); //this onset includes ref time!
    } else if (previousObject) {
      startTime = Time.After([previousObject.getScheduloObject()]);
    } else {
      startTime = Time.At(referenceTime);
    }
    let segment = this.calculateSegment(dymoUri);

    return this.schedulo.scheduleAudio(
      [this.store.getSourcePath(dymoUri)],
      startTime,
      Playback.Oneshot(segment[0], segment[1])
    ).then(audioObject => new Promise<ScheduloScheduledObject>(resolve => {
      newObject.setScheduloObject(audioObject[0]);
      newObject.getScheduloObject().on('loaded', ()=>{
        resolve(newObject);
      });
      //resolve(newObject);
    }));
  }
}