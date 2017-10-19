import * as _ from 'lodash';
import * as uris from '../globals/uris'
import { DymoStore } from '../io/dymostore'
import { Rendering } from '../model/rendering'
import { SequentialNavigator } from '../navigators/sequential'
import { SimilarityNavigator } from '../navigators/similarity'
import { GraphNavigator } from '../navigators/graph'
import { Control } from '../model/control'
import { UIControl } from '../controls/uicontrol'
import { DataControl } from '../controls/datacontrol'
import { AccelerometerControl } from '../controls/sensor/accelerometercontrol'
import { TiltControl } from '../controls/sensor/tiltcontrol'
import { GeolocationControl } from '../controls/sensor/geolocationcontrol'
import { DistanceControl } from '../controls/sensor/geodistancecontrol'
import { CompassControl } from '../controls/sensor/compasscontrol'
import { BeaconControl } from '../controls/sensor/beaconcontrol'
import { RandomControl } from '../controls/auto/randomcontrol'
import { BrownianControl } from '../controls/auto/browniancontrol'
import { RampControl } from '../controls/auto/rampcontrol'
import { ConstraintLoader } from './constraintloader';
import { Constraint } from '../model/constraint';
import { Fetcher, FetchFetcher } from '../util/fetcher';

export interface LoadedStuff {
  dymoUris: string[],
  rendering: Rendering,
  controls: (Control|UIControl)[],
  constraints: Constraint[]
}

/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld into the given DymoStore
 * and creates the necessary controls, constraints, and renderings
 * @constructor
 * @param {DymoStore} dymoStore
 */
export class DymoLoader {

  private store: DymoStore;
  private controls = new Map<string,Control|UIControl>(); //dict with all the controls created
  private constraints = new Map<string,Constraint>();
  private renderings = new Map<string,Rendering>();
  private currentBasePath = '';
  private latestLoadedStuff: LoadedStuff;

  constructor(dymoStore: DymoStore, private fetcher: Fetcher = new FetchFetcher()) {
    this.store = dymoStore;
    this.resetLatestLoadedStuff();
  }

  loadFromFiles(...fileUris: string[]): Promise<LoadedStuff> {
    return this.loadIntoStore(...fileUris)
      .then(() => this.loadFromStore());
  }

  loadFromString(string: string): Promise<LoadedStuff> {
    return this.store.loadData(string)
      .then(() => this.loadFromStore());
  }

  loadIntoStore(...fileUris: string[]): Promise<any> {
    //TODO now simply takes path of first file as reference, CHANGE!!
    const shouldLoad = fileUris.length > 0;
    if (shouldLoad) {
        this.currentBasePath = fileUris[0].substring(0, fileUris[0].lastIndexOf('/') + 1);
        return Promise.all(fileUris.map(f => this.fetcher.fetchText(f)
            .then(jsonld => this.store.loadData(jsonld))));
    } else {
        return Promise.resolve();
    }
  }

  private resetLatestLoadedStuff(): LoadedStuff {
    let latest = this.latestLoadedStuff;
    this.latestLoadedStuff = { dymoUris:[], rendering:null, controls:[], constraints:[] };
    return latest;
  }

  private addLatestLoadedStuff(type: string, stuff: any[]) {
    this.latestLoadedStuff[type] = this.latestLoadedStuff[type].concat(stuff);
  }

  loadFromStore(...objectUris: string[]): LoadedStuff {
    let controlUris = [], dymoUris, renderingUri, constraintUris = [], navigatorUris = [];
    if (objectUris.length > 0) {
      let types = objectUris.map(u => this.store.findObject(u, uris.TYPE));
      dymoUris = objectUris.filter((u,i) => types[i] === uris.DYMO);
      renderingUri = objectUris.filter((u,i) => types[i] === uris.RENDERING);
      controlUris = objectUris.filter((u,i) => this.store.isSubclassOf(types[i], uris.MOBILE_CONTROL));
      constraintUris = objectUris.filter((u,i) => types[i] === uris.FOR_ALL); //that's what constraints are currently
    } else {
      dymoUris = this.store.findTopDymos();
      renderingUri = this.store.findSubject(uris.TYPE, uris.RENDERING);
    }
    this.addLatestLoadedStuff("dymoUris", this.loadDymos(...dymoUris));
    this.addLatestLoadedStuff("controls", this.loadControls(...controlUris));
    this.latestLoadedStuff.rendering = this.loadRendering(renderingUri);
    this.addLatestLoadedStuff("constraints", this.loadConstraints(constraintUris));
    return this.resetLatestLoadedStuff();
  }

  private loadDymos(...dymoUris: string[]): string[] {
    var loadedDymos = [];
    dymoUris.forEach(u => {
      this.store.addBasePath(u, this.currentBasePath);
      //create all dymo constraints
      this.addLatestLoadedStuff("constraints", this.loadConstraintsOfOwner(u));
    })
    return dymoUris;
  }

  private loadRendering(renderingUri?: string): Rendering {
    var dymoUri = this.store.findObject(renderingUri, uris.HAS_DYMO);
    if (!this.renderings.has(renderingUri)) {
      var rendering = new Rendering(dymoUri, this.store);
      this.addLatestLoadedStuff("controls", this.createControls());
      this.addLatestLoadedStuff("constraints", this.loadConstraintsOfOwner(renderingUri));
      this.loadNavigators(renderingUri, rendering);
      this.renderings.set(renderingUri, rendering);
    }
    return this.renderings.get(renderingUri);
  }

  private loadConstraintsOfOwner(ownerUri: string): Constraint[] {
    return this.loadConstraints(this.store.findAllObjects(ownerUri, uris.CONSTRAINT));
  }

  private loadConstraints(constraintUris: string[]): Constraint[] {
    let unloadedUris = _.difference(constraintUris, [...this.constraints.keys()]);
    let constraints = new ConstraintLoader(this.store).loadConstraints(unloadedUris);
    constraints.forEach(c => c.maintain(this.store));
    unloadedUris.forEach((u,i) => this.constraints.set(u, constraints[i]));
    return constraints;
  }

  private loadNavigators(renderingUri: string, rendering: Rendering) {
    var navigators = this.store.findAllObjects(renderingUri, uris.HAS_NAVIGATOR);
    for (var i = 0; i < navigators.length; i++) {
      var variable = new ConstraintLoader(this.store).loadVariable(this.store.findObject(navigators[i], uris.NAV_DYMOS));
      rendering.addSubsetNavigator(variable, this.getNavigator(this.store.findObject(navigators[i], uris.TYPE)));
    }
  }

  private createControls() {
    var controlClasses = this.store.recursiveFindAllSubClasses(uris.MOBILE_CONTROL);
    var controlUris = _.flatMap(controlClasses, c => this.store.findSubjects(uris.TYPE, c));
    return this.loadControls(...controlUris);
  }

  private loadControls(...controlUris: string[]): (Control|UIControl)[] {
    let unloadedControls = _.difference(controlUris, [...this.controls.keys()]);
    unloadedControls.forEach(u => {
      var currentName = this.store.findObjectValue(u, uris.NAME);
      currentName = currentName ? currentName : u;
      var controlType = this.store.findObject(u, uris.TYPE);
      this.controls.set(u, this.getControl(u, currentName, controlType));
    });
    return controlUris.map(u => this.controls.get(u));
  }

  private getControl(uri: string, name: string, type: string): Control|UIControl {
    var control;
    if (type == uris.ACCELEROMETER_X || type == uris.ACCELEROMETER_Y || type == uris.ACCELEROMETER_Z) {
      control = new AccelerometerControl(type, this.store);
    } else if (type == uris.TILT_X || type == uris.TILT_Y) {
      control = new TiltControl(type, this.store);
    } else if (type == uris.GEOLOCATION_LATITUDE || type == uris.GEOLOCATION_LONGITUDE) {
      control = new GeolocationControl(type, this.store);
    }  else if (type == uris.GEOLOCATION_DISTANCE) {
      control = new DistanceControl(this.store);
    }  else if (type == uris.COMPASS_HEADING) {
      control = new CompassControl(this.store);
    }  else if (type == uris.BEACON) {
      var uuid = this.store.findObjectValue(uri, uris.HAS_UUID);
      var major = this.store.findObjectValue(uri, uris.HAS_MAJOR);
      var minor = this.store.findObjectValue(uri, uris.HAS_MINOR);
      control = new BeaconControl(uuid, major, minor, this.store);
    }  else if (type == uris.SLIDER || type == uris.TOGGLE || type == uris.BUTTON || type == uris.CUSTOM_CONTROL) {
      control = new UIControl(uri, name, type, this.store);
      var init = this.store.findObjectValue(uri, uris.VALUE);
      control.value = init;
      control.update();
    } else if (type == uris.RANDOM) {
      control = new RandomControl(uri, this.store);
    } else if (type == uris.BROWNIAN) {
      var init = this.store.findObjectValue(uri, uris.VALUE);
      control = new BrownianControl(uri, this.store, init);
    } else if (type == uris.RAMP) {
      var milisDuration = Math.round(this.store.findObjectValue(uri, uris.HAS_DURATION)*1000);
      var init = this.store.findObjectValue(uri, uris.VALUE);
      control = new RampControl(uri, milisDuration, this.store, init);
    } else if (type == uris.DATA_CONTROL) {
      var url = this.store.findObjectValue(uri, uris.HAS_URL);
      var jsonMapString = String(this.store.findObjectValue(uri, uris.HAS_JSON_MAP));
      var jsonMap = new Function("json", jsonMapString);
      control = new DataControl(uri, url, jsonMap, this.store, this.fetcher);
    }
    //TODO implement in better way (only works for sensor controls)
    if (this.store.findObjectValue(uri, uris.IS_SMOOTH) && control.setSmooth) {
      control.setSmooth(true);
    }
    var average = this.store.findObjectValue(uri, uris.IS_AVERAGE_OF);
    if (!isNaN(Number(average)) && control.setAverageOf) {
      control.setAverageOf(average);
    }
    return control;
  }

  private getNavigator(type) {
    if (type == uris.SIMILARITY_NAVIGATOR) {
      return new SimilarityNavigator(undefined, this.store);
    } else if (type == uris.GRAPH_NAVIGATOR) {
      return new GraphNavigator(undefined, this.store);
    }
    return new SequentialNavigator(undefined, this.store);
  }

}