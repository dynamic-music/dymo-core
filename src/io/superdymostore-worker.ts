import * as registerPromiseWorker from 'promise-worker/register';
import { SuperDymoStore } from './superdymostore';

const store = new SuperDymoStore();

registerPromiseWorker(message => {
  //console.log(message)
  if (message.function === "addParameterObserver") {
    //store.addParameterObserver(...message.args)
  }
  return store[message.function](...message.args);
});