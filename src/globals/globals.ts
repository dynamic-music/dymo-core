import { DymoStore } from '../io/dymostore'

export module GlobalVars {

  export var DYMO_STORE: DymoStore;

  export var OPTIMIZED_MODE: boolean = false;
  export var LOGGING_ON: boolean = false;
  export var SCHEDULE_AHEAD_TIME: number = 0.1; //seconds
  export var FADE_LENGTH: number = 0.02; //seconds

}

export const DYMO_ONTOLOGY_URI = "http://tiny.cc/dymo-ontology#";

// navigator flags
export const DONE = "done";
export const MORE = "more";
