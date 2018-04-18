import * as registerPromiseWorker from 'promise-worker/register';
import { SuperDymoStore } from './superdymostore';

declare var self;

const store = new SuperDymoStore();

registerPromiseWorker(message => {
  //console.log(message)
  if (message.function === "addParameterObserver"
      || message.function === "addTypeObserver") {
    message.args[message.args.length-1] = self;
  }
  return store[message.function](...message.args);
});

self.observedValueChanged = function(paramUri: string, paramType: string, value: number) {
  self.postMessage({paramUri: paramUri, paramType: paramType, value: value});
}