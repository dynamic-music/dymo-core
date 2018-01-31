import { AudioObject, Parameter, Time, Stop } from 'schedulo';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { DymoPlayer } from './player';
import { ScheduledObject } from './scheduler';

const PARAM_PAIRINGS = new Map<string,number>();
PARAM_PAIRINGS.set(uris.ONSET, Parameter.StartTime);
PARAM_PAIRINGS.set(uris.AMPLITUDE, Parameter.Amplitude);
PARAM_PAIRINGS.set(uris.PAN, Parameter.Panning);
PARAM_PAIRINGS.set(uris.DISTANCE, Parameter.Panning);
PARAM_PAIRINGS.set(uris.HEIGHT, Parameter.Panning);
PARAM_PAIRINGS.set(uris.REVERB, Parameter.Reverb);
PARAM_PAIRINGS.set(uris.DELAY, Parameter.Delay);
//PARAM_PAIRINGS.set(uris.LOOP, Parameter.Loop);
PARAM_PAIRINGS.set(uris.PLAYBACK_RATE, Parameter.PlaybackRate);

export class ScheduloScheduledObject extends ScheduledObject {

  private typeToBehavior = new Map<string,string>();
  private dymoToParam = new Map<string,string>();
  private paramToType = new Map<string,string>();
  private paramToValue = new Map<string,number>();
  private paramToBValue = new Map<string,number>();
  private object: AudioObject;

  constructor(dymoUri: string, private referenceTime: number,
      store: DymoStore, player: DymoPlayer) {
    super(dymoUri, store, player);
    PARAM_PAIRINGS.forEach((param, typeUri) => {
      this.initParam(dymoUri, typeUri);
      //if behavior not independent, observe parents
      let behavior = this.store.findObject(typeUri, uris.HAS_BEHAVIOR);
      this.typeToBehavior.set(typeUri, behavior);
      if (behavior && behavior !== uris.INDEPENDENT) {
        this.parentUris.forEach(p => this.initParam(p, typeUri));
      }
      this.updateParam(typeUri);
      //this.store.findParameterValue(this.dymoUri, typeUri);
    });
  }

  private initParam(dymoUri: string, typeUri: string) {
    let paramUri = this.store.addParameterObserver(dymoUri, typeUri, this);
    let value = this.store.findParameterValue(dymoUri, typeUri);
    //TODO ONLY IF PARAM EXISTS AND VALUE NOT NULL!!!!!!
    this.dymoToParam.set(dymoUri, paramUri);
    this.paramToType.set(paramUri, typeUri);
    this.paramToValue.set(paramUri, value);
  }

  setScheduloObject(object: AudioObject) {
    this.object = object;
    this.object.on('playing', () => this.player.objectStarted(this));
    this.object.on('stopped', () => this.player.objectEnded(this));
    if (this.dymoUri === 'http://tiny.cc/dymo-ontology/dymo5') {
      console.log(this.paramToBValue.get(uris.AMPLITUDE));
    }
    this.paramToBValue.forEach((value, typeUri) =>
      this.object.set(PARAM_PAIRINGS.get(typeUri), value));
  }

  getScheduloObject(): AudioObject {
    return this.object;
  }

  getReferenceTime(): number {
    return this.referenceTime;
  }

  getParam(paramUri: string): number {
    return this.paramToBValue.get(paramUri);
  }

  stop() {
    if (this.object) {
      this.object.stop(Time.Immediately, Stop.Immediately);
    }
    PARAM_PAIRINGS.forEach((param, typeUri) => {
      this.store.removeParameterObserver(this.dymoUri, typeUri, this);
      //TODO REMOVE OBSERVERS FOR ALL PARENTS!!!!!!
    })
  }

  private updateParam(typeUri: string) {
    //TODO GO THROUGH ALL PARENTS AND PROCESS (* or +...)
    let paramsOfType = [...this.paramToType.keys()].filter(p => this.paramToType.get(p) === typeUri);
    let allValues = paramsOfType.map(p => this.paramToValue.get(p)).filter(v => !isNaN(v));

    //calculate value based on behavior
    let value;
    if (this.typeToBehavior.get(typeUri) === uris.ADDITIVE) {
      value = allValues.reduce((a,b) => a+b);
    } else if (this.typeToBehavior.get(typeUri) === uris.MULTIPLICATIVE) {
      value = allValues.reduce((a,b) => a*b);
    } else {
      value = allValues[0]; //only one value since parents not added...
    }

    //deal with onset specifically
    if (typeUri === uris.ONSET) {
      value = this.referenceTime+value;
    }
    if (typeUri === uris.PAN || typeUri === uris.DISTANCE || typeUri === uris.HEIGHT) {
      let pan = this.paramToValue.get(uris.PAN);
      let dist = this.paramToValue.get(uris.DISTANCE);
      let heig = this.paramToValue.get(uris.HEIGHT);
      if (pan != null && dist != null && heig != null) {
        value = [pan, dist, heig];
      } else {
        value = null;
      }
    }

    //update the schedulo object
    if (value != null) {
      //console.log(typeUri, value)
      this.paramToBValue.set(typeUri, value);
      if (this.object) {
        this.object.set(PARAM_PAIRINGS.get(typeUri), value);
      }
    }
  }

  getDuration(): number {
    //TODO USE BUFFER DURATION FROM SCHEDULO OBJECT
    let duration = this.paramToValue.get(uris.DURATION);
    let playbackRate = this.paramToValue.get(uris.PLAYBACK_RATE);
    duration /= playbackRate ? playbackRate : 1;
    let stretchRatio = this.paramToValue.get(uris.TIME_STRETCH_RATIO);
    duration /= stretchRatio ? stretchRatio : 1;
    return duration;
  }

  getEndTime(): number {
    return this.object.startTime+this.object.duration;
  }

  observedValueChanged(paramUri: string, paramType: string, value: number) {
    this.paramToValue.set(paramUri, value);
    this.updateParam(paramType);
  }

}