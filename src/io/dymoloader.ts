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

export interface LoadedStuff {
  dymoUris: string[],
  rendering: Rendering,
  controls: {},
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
  private controls = {}; //dict with all the controls created
  private constraints: Constraint[] = [];

  constructor(dymoStore) {
    this.store = dymoStore;
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
    /*return fetch(fileUris[0], { mode:'cors' })
      .then(response => response.text())
      .then(jsonld => this.store.loadData(jsonld))*/
    return Promise.all(
      fileUris.map(f => fetch(f, { mode:'cors' })
        .then(response => response.text())
        .then(jsonld => this.store.loadData(jsonld)))
    )
  }

  loadFromStore(...objectUris: string[]): LoadedStuff {
    let loadedStuff: LoadedStuff = { dymoUris:[], rendering:null, controls:{}, constraints:[] };
    let controlUris = [], dymoUris, renderingUri, constraintUris = [], navigatorUris = [];
    if (objectUris.length > 0) {
      let types = objectUris.map(u => this.store.findObject(u, uris.TYPE));
      dymoUris = objectUris.filter((u,i) => types[i] === uris.DYMO);
      renderingUri = objectUris.filter((u,i) => types[i] === uris.RENDERING);
      controlUris = objectUris.filter((u,i) => this.store.isSubclassOf(types[i], uris.MOBILE_CONTROL));
      constraintUris = objectUris.filter((u,i) => types[i] === uris.CONSTRAINT);
    } else {
      dymoUris = this.store.findTopDymos();
      renderingUri = this.store.findSubject(uris.TYPE, uris.RENDERING);
    }
    loadedStuff.dymoUris = this.loadDymos(...dymoUris);
    loadedStuff.controls = Object.assign(this.controls, this.loadControls(...controlUris));
    loadedStuff.rendering = this.loadRendering(renderingUri);
    loadedStuff.constraints = this.constraints.concat(this.loadConstraints(constraintUris));
    return loadedStuff;
  }

  private loadDymos(...dymoUris: string[]): string[] {
    var loadedDymos = [];
    dymoUris.forEach(u => {
      //this.store.addBasePath(u, this.dymoBasePath)
      //create all dymo constraints
      this.loadConstraintsOfOwner(u);
    })
    return dymoUris;
  }

  private loadRendering(renderingUri?: string): Rendering {
    var rendering = new Rendering(this.store.findObject(renderingUri, uris.HAS_DYMO), this.store);
    this.createControls();
    this.loadConstraintsOfOwner(renderingUri);
    this.loadNavigators(renderingUri, rendering);
    return rendering;
  }

  private loadConstraintsOfOwner(ownerUri: string) {
    this.constraints = this.constraints.concat(this.loadConstraints(this.store.findAllObjects(ownerUri, uris.CONSTRAINT)));
  }

  private loadConstraints(constraintUris: string[]): Constraint[] {
    let constraints = new ConstraintLoader(this.store).loadConstraints(constraintUris);
    constraints.forEach(c => c.maintain(this.store));
    return constraints;
  }

  private loadNavigators(renderingUri: string, rendering: Rendering) {
    var navigators = this.store.findAllObjects(renderingUri, uris.HAS_NAVIGATOR);
    for (var i = 0; i < navigators.length; i++) {
      //TODO NEEDS TO BE AN EXPRESSION!!!!!
      //var dymosFunction = this.createFunction(this.store.findObject(navigators[i], uris.NAV_DYMOS), true);
      var variable = new ConstraintLoader(this.store).loadVariable(this.store.findObject(navigators[i], uris.NAV_DYMOS));
      rendering.addSubsetNavigator(variable, this.getNavigator(this.store.findObject(navigators[i], uris.TYPE)));
    }
  }

  private createControls() {
    var controlClasses = this.store.recursiveFindAllSubClasses(uris.MOBILE_CONTROL);
    for (var i = 0; i < controlClasses.length; i++) {
      var currentControls = this.store.findSubjects(uris.TYPE, controlClasses[i]);
      _.forEach(this.loadControls(...currentControls), (v,k) => {
        if (!this.controls[k]) {
          this.controls[k] = v;
        }
      })
    }
  }

  private loadControls(...controlUris: string[]): {} {
    var controls = {};
    controlUris.forEach(c => {
      var currentName = this.store.findObjectValue(c, uris.NAME);
      if (!currentName) {
        currentName = c;
      }
      var controlType = this.store.findObject(c, uris.TYPE);
      if (!this.controls[c]) {
        controls[c] = this.getControl(c, currentName, controlType);
      }
    });
    return controls;
  }

  private getControl(uri: string, name: string, type: string) {
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
      control = new DataControl(uri, url, jsonMap, this.store);
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