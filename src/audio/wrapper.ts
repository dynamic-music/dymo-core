import { AudioObject, Parameter, Time, Stop } from 'schedulo';
import * as uris from '../globals/uris';
import { DymoStore } from '../io/dymostore';

const PARAM_PAIRINGS = new Map<string,number>();
PARAM_PAIRINGS.set(uris.AMPLITUDE, Parameter.Amplitude);
PARAM_PAIRINGS.set(uris.REVERB, Parameter.Reverb);
PARAM_PAIRINGS.set(uris.LOOP, Parameter.Loop);

export class ScheduloObjectWrapper {

  constructor(public dymoUri: string, private object: AudioObject,
      private store: DymoStore, private onEnded: (o:ScheduloObjectWrapper) => any) {
    PARAM_PAIRINGS.forEach((param, typeUri) => {
      this.store.addParameterObserver(this.dymoUri, typeUri, this);
      //TODO ADD OBSERVERS FOR ALL PARENTS!!!!!!
      this.updateParam(typeUri);
    })
  }

  getUri(): string {
    return this.dymoUri;
  }

  stop() {
    this.object.stop(Time.Immediately, Stop.Immediately);
  }

  private updateParam(typeUri: string, value?: number) {
    //TODO GO THROUGH ALL PARENTS AND PROCESS (* or +...)
    //TODO LATER KEEP A CACHE OF ALL VALUES!! AND PASS IN THE CHANGED ONE
    value = !isNaN(value) ? value : this.store.findParameterValue(this.dymoUri, typeUri);
    if (value != null) {
      this.object.set(PARAM_PAIRINGS.get(typeUri), value);
    }
  }

  //TODO OBSERVE SCHEDULO OBJECT TO FIND OUT WHEN IT ENDS
  //.then(() => this.onEnded(this));

  observedValueChanged(paramUri: string, paramType: string, value: number) {
    this.updateParam(paramType, value);
  }

}