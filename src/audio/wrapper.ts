import { AudioObject, Parameter, Time, Stop } from 'schedulo';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';
import { SchedulerThread } from './thread';

const PARAM_PAIRINGS = new Map<string,number>();
PARAM_PAIRINGS.set(uris.ONSET, Parameter.StartTime);
PARAM_PAIRINGS.set(uris.AMPLITUDE, Parameter.Amplitude);
PARAM_PAIRINGS.set(uris.PAN, Parameter.Panning);
PARAM_PAIRINGS.set(uris.DISTANCE, Parameter.Panning);
PARAM_PAIRINGS.set(uris.HEIGHT, Parameter.Panning);
PARAM_PAIRINGS.set(uris.REVERB, Parameter.Reverb);
PARAM_PAIRINGS.set(uris.DELAY, Parameter.Delay);
PARAM_PAIRINGS.set(uris.LOOP, Parameter.Loop);
PARAM_PAIRINGS.set(uris.PLAYBACK_RATE, Parameter.PlaybackRate);

export class ScheduloObjectWrapper {

  private parentUris: string[];
  private typeToBehavior = new Map<string,string>();
  private dymoToParam = new Map<string,string>();
  private paramToType = new Map<string,string>();
  private paramToValue = new Map<string,number>();

  constructor(public dymoUri: string, private scheduleTime: number, private object: AudioObject,
      private store: DymoStore, private thread: SchedulerThread) {
    this.parentUris = this.store.findAllParents(this.dymoUri);
    PARAM_PAIRINGS.forEach((param, typeUri) => {
      this.initParam(dymoUri, typeUri);
      //if behavior not independent, observe parents
      let behavior = this.store.findObject(typeUri, uris.HAS_BEHAVIOR);
      this.typeToBehavior.set(typeUri, behavior);
      if (behavior && behavior !== uris.INDEPENDENT) {
        this.parentUris.forEach(p => this.initParam(p, typeUri));
      }
      //this.store.findParameterValue(this.dymoUri, typeUri);
    });
    this.object.on('playing', ()=>this.thread.objectStarted(this))
    this.object.on('stopped', ()=>this.thread.objectEnded(this))
  }

  private initParam(dymoUri: string, typeUri: string) {
    let paramUri = this.store.addParameterObserver(dymoUri, typeUri, this);
    this.dymoToParam.set(dymoUri, paramUri);
    this.paramToType.set(paramUri, typeUri);
    this.paramToValue.set(paramUri, this.store.findParameterValue(dymoUri, typeUri));
  }

  getUri(): string {
    return this.dymoUri;
  }

  getUris(): string[] {
    return [this.dymoUri].concat(this.parentUris);
  }

  stop() {
    this.object.stop(Time.Immediately, Stop.Immediately);
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
      value = this.scheduleTime+value;
    }
    if (typeUri === uris.PAN || typeUri === uris.DISTANCE || typeUri === uris.HEIGHT) {
      value = [this.paramToValue.get(uris.PAN), this.paramToValue.get(uris.DISTANCE), this.paramToValue.get(uris.HEIGHT)];
    }

    //update the schedulo object
    if (value != null) {
      this.object.set(PARAM_PAIRINGS.get(typeUri), value);
    }
  }

  observedValueChanged(paramUri: string, paramType: string, value: number) {
    this.paramToValue.set(paramUri, value);
    this.updateParam(paramType);
  }

}