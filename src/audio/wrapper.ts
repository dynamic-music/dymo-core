import { AudioObject, Parameter, Time, Stop } from 'schedulo';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore-service';
import { DymoPlayer } from './player';
import { ScheduledObject } from './scheduler';

const FEATURE_PAIRINGS = new Map<string,number>();
FEATURE_PAIRINGS.set(uris.TIME_FEATURE, Parameter.Offset);
FEATURE_PAIRINGS.set(uris.DURATION_FEATURE, Parameter.Duration);

const PARAM_PAIRINGS = new Map<string,number>();
PARAM_PAIRINGS.set(uris.ONSET, Parameter.StartTime);
PARAM_PAIRINGS.set(uris.DURATION, Parameter.Duration);
PARAM_PAIRINGS.set(uris.DURATION_RATIO, Parameter.DurationRatio);
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
  private attributeToType = new Map<string,string>();
  private attributeToValue = new Map<string,number>();
  private attributeToValueAfterBehavior = new Map<string,number>();
  private object: AudioObject;

  constructor(dymoUri: string, private referenceTime: number,
      store: DymoStore, player: DymoPlayer) {
    super(dymoUri, store, player);
    this.init2();
  }

  private init2() {
    //TODO SIMPLIFY!!
    FEATURE_PAIRINGS.forEach(async (feature, typeUri) => {
      this.initFeature(this.dymoUri, typeUri);
      //if behavior not independent, observe parents
      let behavior = await this.store.findObject(typeUri, uris.HAS_BEHAVIOR);
      this.typeToBehavior.set(typeUri, behavior);
      if (behavior && behavior !== uris.INDEPENDENT) {
        this.parentUris.forEach(p => this.initFeature(p, typeUri));
      }
    });
    FEATURE_PAIRINGS.forEach((feature, typeUri) => this.updateObjectParam(typeUri));
    PARAM_PAIRINGS.forEach(async (param, typeUri) => {
      this.initParam(this.dymoUri, typeUri);
      //if behavior not independent, observe parents
      let behavior = await this.store.findObject(typeUri, uris.HAS_BEHAVIOR);
      this.typeToBehavior.set(typeUri, behavior);
      if (behavior && behavior !== uris.INDEPENDENT) {
        this.parentUris.forEach(p => this.initParam(p, typeUri));
      }
    });
    PARAM_PAIRINGS.forEach((param, typeUri) => this.updateObjectParam(typeUri));
  }

  private async initFeature(dymoUri: string, typeUri: string) {
    let featureUri = await this.store.setFeature(dymoUri, typeUri);
    let value = await this.store.findFeatureValue(dymoUri, typeUri);
    this.dymoToParam.set(dymoUri, featureUri);
    this.attributeToType.set(featureUri, typeUri);
    this.attributeToValue.set(featureUri, value);
  }


  private async initParam(dymoUri: string, typeUri: string) {
    let paramUri = await this.store.addParameterObserver(dymoUri, typeUri, this);
    let value = await this.store.findParameterValue(dymoUri, typeUri);
    //console.log(dymoUri, typeUri, paramUri, value);
    //TODO ONLY IF PARAM EXISTS AND VALUE NOT NULL!!!!!!
    this.dymoToParam.set(dymoUri, paramUri);
    this.attributeToType.set(paramUri, typeUri);
    this.attributeToValue.set(paramUri, value);
  }

  setScheduloObject(object: AudioObject) {
    this.object = object;
    this.object.on('playing', () => this.player.objectStarted(this));
    this.object.on('stopped', () => this.player.objectEnded(this));
    this.attributeToValueAfterBehavior.forEach((value, typeUri) =>
      this.setObjectParam(typeUri, value));
  }

  getScheduloObject(): AudioObject {
    return this.object;
  }

  getReferenceTime(): number {
    return this.referenceTime;
  }

  getParam(paramUri: string): number {
    return this.attributeToValueAfterBehavior.get(paramUri);
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

  private updateObjectParam(typeUri: string) {
    //console.log("UPDATE", typeUri)
    //TODO GO THROUGH ALL PARENTS AND PROCESS (* or +...)
    let paramsOfType = [...this.attributeToType.keys()].filter(p => this.attributeToType.get(p) === typeUri);
    let allValues = paramsOfType.map(p => this.attributeToValue.get(p)).filter(v => !isNaN(v));

    //calculate value based on behavior
    let value;
    if (allValues.length > 0) {
      if (this.typeToBehavior.get(typeUri) === uris.ADDITIVE) {
        value = allValues.reduce((a,b) => a+b);
      } else if (this.typeToBehavior.get(typeUri) === uris.MULTIPLICATIVE) {
        value = allValues.reduce((a,b) => a*b);
      } else {
        value = allValues[0]; //only one value since parents not added...
      }
    }

    //deal with onset specifically
    if (typeUri === uris.ONSET && value != null) {
      value = this.referenceTime+value;
    }

    //merge panning into list
    if (typeUri === uris.PAN || typeUri === uris.DISTANCE || typeUri === uris.HEIGHT) {
      let pan = this.attributeToValue.get(uris.PAN);
      let dist = this.attributeToValue.get(uris.DISTANCE);
      let heig = this.attributeToValue.get(uris.HEIGHT);
      if (pan != null && dist != null && heig != null) {
        value = [pan, dist, heig];
      } else {
        value = null;
      }
    }

    //console.log("UPDATE2", typeUri, value, allValues)
    //update the schedulo object
    if (value != null) {
      //console.log(typeUri, value)
      this.attributeToValueAfterBehavior.set(typeUri, value);
      this.setObjectParam(typeUri, value);
    }
  }

  private setObjectParam(typeUri: string, value) {
    if (this.object) {
      const target = PARAM_PAIRINGS.get(typeUri) || FEATURE_PAIRINGS.get(typeUri);
      this.object.set(target, value);
    }
  }

  getEndTime(): number {
    return this.object.getStartTime()+this.object.getDuration();
  }

  observedValueChanged(paramUri: string, paramType: string, value: number) {
    this.attributeToValue.set(paramUri, value);
    this.updateObjectParam(paramType);
  }

}