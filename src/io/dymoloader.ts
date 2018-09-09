import * as _ from 'lodash';
import * as uris from '../globals/uris'
import { SuperDymoStore } from '../globals/types'
import { Rendering } from '../model/rendering'
import { Control } from '../model/control'
import { UIControl } from '../controls/uicontrol'
import { DataControl } from '../controls/datacontrol'
import { SensorControl } from '../controls/sensorcontrol'
import { RandomControl } from '../controls/auto/randomcontrol'
import { BrownianControl } from '../controls/auto/browniancontrol'
import { RampControl } from '../controls/auto/rampcontrol'
import { Fetcher, FetchFetcher } from '../util/fetcher';

export interface LoadedStuff {
  dymoUris: string[],
  rendering: Rendering,
  controls: (Control|UIControl)[],
  constraintUris: string[]
}

/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld into the given DymoStore
 * and creates the necessary controls, constraints, and renderings
 */
export class DymoLoader {

  private store: SuperDymoStore;
  private controls = new Map<string,Control|UIControl>(); //dict with all the controls created
  private renderings = new Map<string,Rendering>();
  private currentBasePath = '';
  private latestLoadedStuff: LoadedStuff;
  private loadedDymos = [];

  constructor(dymoStore: SuperDymoStore, private fetcher: Fetcher = new FetchFetcher()) {
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
    this.latestLoadedStuff = { dymoUris:[], rendering:null, controls:[], constraintUris:[] };
    return latest;
  }

  private addLatestLoadedStuff(type: string, stuff: any[]) {
    this.latestLoadedStuff[type] = _.uniq(this.latestLoadedStuff[type].concat(stuff));
  }

  async loadFromStore(...objectUris: string[]): Promise<LoadedStuff> {
    let controlUris: string[] = [], dymoUris: string[], renderingUri: string,
      constraintUris: string[] = [], navigatorUris: string[] = [];
    if (objectUris.length > 0) {
      let types = await Promise.all(objectUris.map(u => this.store.findObject(u, uris.TYPE)));
      dymoUris = objectUris.filter((u,i) => types[i] === uris.DYMO);
      renderingUri = objectUris.filter((u,i) => types[i] === uris.RENDERING)[0];
      let isControlType = await Promise.all(types.map(t => this.store.isSubclassOf(t, uris.MOBILE_CONTROL)));
      controlUris = objectUris.filter((u,i) => isControlType[i]);
      constraintUris = objectUris.filter((u,i) => types[i] === uris.FOR_ALL); //that's what constraints are currently
    } else {
      dymoUris = await this.store.findTopDymos();
      renderingUri = await this.store.findSubject(uris.TYPE, uris.RENDERING);
    }
    this.addLatestLoadedStuff("dymoUris", await this.loadDymos(...dymoUris));
    this.addLatestLoadedStuff("controls", await this.loadControls(...controlUris));
    if (renderingUri) {
      this.latestLoadedStuff.rendering = await this.loadRendering(renderingUri);
    }
    this.addLatestLoadedStuff("constraintUris", await this.store.activateNewConstraints(constraintUris));
    return this.resetLatestLoadedStuff();
  }

  private async loadDymos(...dymoUris: string[]): Promise<string[]> {
    const unloadedDymos = _.difference(dymoUris, this.loadedDymos);
    await Promise.all(unloadedDymos.map(async u => {
      this.store.addBasePath(u, this.currentBasePath);
      //create all dymo constraints
      this.addLatestLoadedStuff("constraintUris", await this.activateConstraintsOfOwner(u));
    }));
    this.loadedDymos = this.loadedDymos.concat(unloadedDymos);
    return unloadedDymos;
  }

  private async loadRendering(renderingUri: string): Promise<Rendering> {
    var dymoUri = await this.store.findObject(renderingUri, uris.HAS_DYMO);
    if (renderingUri && !this.renderings.has(renderingUri)) {
      var rendering = new Rendering(dymoUri);
      this.addLatestLoadedStuff("controls", await this.createControls());
      this.addLatestLoadedStuff("constraintUris", await this.activateConstraintsOfOwner(renderingUri));
      this.loadNavigators(renderingUri, rendering);
      this.renderings.set(renderingUri, rendering);
    }
    return this.renderings.get(renderingUri);
  }

  private async activateConstraintsOfOwner(ownerUri: string): Promise<string[]> {
    let constraints = await this.store.findAllObjects(ownerUri, uris.CONSTRAINT);
    return this.store.activateNewConstraints(constraints);
  }

  private async loadNavigators(renderingUri: string, rendering: Rendering) {
    var navigators = await this.store.findAllObjects(renderingUri, uris.HAS_NAVIGATOR);
    for (var i = 0; i < navigators.length; i++) {
      //var variable = new ConstraintLoader(this.store).loadVariable(await this.store.findObject(navigators[i], uris.NAV_DYMOS));
      //rendering.addSubsetNavigator(variable, this.getNavigator(this.store.findObject(navigators[i], uris.TYPE)));
    }
  }

  private async createControls() {
    var controlClasses = await this.store.recursiveFindAllSubClasses(uris.MOBILE_CONTROL);

    var controlUris = _.flatten(await Promise.all(controlClasses.map(c => this.store.findSubjects(uris.TYPE, c))));
    return this.loadControls(...controlUris);
  }

  private async loadControls(...controlUris: string[]): Promise<(Control|UIControl)[]> {
    let unloadedControls = _.difference(controlUris, [...this.controls.keys()]);
    await Promise.all(unloadedControls.map(async u => {
      var currentName = await this.store.findObjectValue(u, uris.NAME);
      currentName = currentName ? currentName : u;
      var controlType = await this.store.findObject(u, uris.TYPE);
      this.controls.set(u, await this.getControl(u, currentName, controlType));
    }));
    return unloadedControls.map(u => this.controls.get(u));
  }

  private async getControl(uri: string, name: string, type: string): Promise<Control|UIControl> {
    var control;
    if (type == uris.ACCELEROMETER_X || type == uris.ACCELEROMETER_Y || type == uris.ACCELEROMETER_Z
      || type == uris.TILT_X || type == uris.TILT_Y
      || type == uris.GEOLOCATION_LATITUDE || type == uris.GEOLOCATION_LONGITUDE
      || type == uris.GEOLOCATION_DISTANCE || type == uris.COMPASS_HEADING) {
      control = new SensorControl(uri, type, this.store);
    } /* else if (type == uris.BEACON) {
      var uuid = this.store.findObjectValue(uri, uris.HAS_UUID);
      var major = this.store.findObjectValue(uri, uris.HAS_MAJOR);
      var minor = this.store.findObjectValue(uri, uris.HAS_MINOR);
      control = new BeaconControl(uuid, major, minor, this.store);
    }*/ else if (type == uris.SLIDER || type == uris.TOGGLE || type == uris.BUTTON || type == uris.CUSTOM_CONTROL) {
      control = new UIControl(uri, name, type, this.store);
      var init = await this.store.findObjectValue(uri, uris.VALUE);
      //control.value = init;
      //control.update();
      control.updateValue(init);
    } else if (type == uris.RANDOM) {
      control = new RandomControl(uri, this.store);
    } else if (type == uris.BROWNIAN) {
      var init = await this.store.findObjectValue(uri, uris.VALUE);
      control = new BrownianControl(uri, this.store, init);
    } else if (type == uris.RAMP) {
      var milisDuration = Math.round(await this.store.findObjectValue(uri, uris.HAS_DURATION)*1000);
      var init = await this.store.findObjectValue(uri, uris.VALUE);
      control = new RampControl(uri, milisDuration, this.store, init);
    } else if (type == uris.DATA_CONTROL) {
      var url = await this.store.findObjectValue(uri, uris.HAS_URL);
      var jsonMapString = String(await this.store.findObjectValue(uri, uris.HAS_JSON_MAP));
      var jsonMap = new Function("json", jsonMapString);
      control = new DataControl(uri, url, jsonMap, this.store, this.fetcher);
    }
    //TODO implement in better way (only works for sensor controls)
    if ((await this.store.findObjectValue(uri, uris.IS_SMOOTH)) && control.setSmooth) {
      control.setSmooth(true);
    }
    var average = await this.store.findObjectValue(uri, uris.IS_AVERAGE_OF);
    if (!isNaN(Number(average)) && control.setAverageOf) {
      control.setAverageOf(average);
    }
    return control;
  }

  /*private getNavigator(type) {
    if (type == uris.SIMILARITY_NAVIGATOR) {
      return new SimilarityNavigator(undefined, this.store);
    } else if (type == uris.GRAPH_NAVIGATOR) {
      return new GraphNavigator(undefined, this.store);
    }
    return new SequentialNavigator(undefined, this.store);
  }*/

}