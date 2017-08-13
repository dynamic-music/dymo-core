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

/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld into the given DymoStore
 * and creates the necessary controls, constraints, and renderings
 * @constructor
 * @param {DymoStore} dymoStore
 */
export class DymoLoader {

  private store: DymoStore;
  private dymoBasePath = '';
  private controls = {}; //dict with all the controls created
  private constraints: Constraint[] = [];

  constructor(dymoStore) {
    this.store = dymoStore;
  }

  getConstraints() {
    return this.constraints;
  }

  loadDymoFromFile(fileUri): Promise<string[]> {
    var fileIndex = fileUri.lastIndexOf('/')+1;
    this.dymoBasePath = fileUri.substring(0, fileIndex);
    return this.recursiveLoadFile(fileUri, "")
      .then(loaded => this.store.loadData(loaded))
      .then(() => this.createDymoFromStore());
  }

  parseDymoFromString(jsonldOrRdf): Promise<string[]> {
    return this.store.loadData(jsonldOrRdf)
      .then(() => this.createDymoFromStore());
  }

  loadRenderingFromFile(fileUri): Promise<Object[]> {
    return this.recursiveLoadFile(fileUri, "")
      .then(loaded => this.store.loadData(loaded))
      .then(() => this.createRenderingFromStore());
  }

  //recursively load files that may contain references to other files. only if json-ld, otherwise simple.
  private recursiveLoadFile(fileUri, jsonString): Promise<string> {
    return fetch(fileUri, { mode:'cors' })
      .then(response => response.text())
      .then(text => {
        if (text.indexOf("Cannot GET") >= 0) {
          return null;
        }
        //console.log(this.responseText.substring(0,20), isJsonString(this.responseText))
        if (this.isJsonString(text)) {
          if (jsonString) {
            if (fileUri.indexOf(this.dymoBasePath) >= 0) {
              fileUri = fileUri.replace(this.dymoBasePath, "");
            }
            jsonString = jsonString.replace('"'+fileUri+'"', text);
          } else {
            jsonString = text;
          }
          var nextUri = this.findNextJsonUri(jsonString);
          if (nextUri) {
            if (nextUri.indexOf(this.dymoBasePath) < 0) {
              nextUri = this.dymoBasePath+nextUri;
            }
            return this.recursiveLoadFile(nextUri, jsonString);
          } else if (jsonString) {
            return jsonString;
          }
        } else {
          return text;
        }
      });
  }

  private isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  private findNextJsonUri(jsonString) {
    var index = jsonString.indexOf(".json");
    if (index >= 0) {
      if (index != jsonString.indexOf("context.json")+7) {
        var before = jsonString.substring(0, index);
        var beginning = before.lastIndexOf('"');
        return jsonString.substring(beginning+1, index+5);
      } else {
        return this.findNextJsonUri(jsonString.substring(index+1));
      }
    }
  }

  createDymoFromStore(): string[] {
    var topDymos = [];
    //first create all dymos and save references in map
    var topDymoUris = this.store.findTopDymos();
    topDymoUris.forEach(u => {
      this.store.addBasePath(u, this.dymoBasePath)
      //create all dymo constraints
      this.loadConstraints(u);
    })
    return topDymoUris;
  }

  createRenderingFromStore(): Object[] {
    var renderingUri = this.store.findSubject(uris.TYPE, uris.RENDERING);
    var rendering = new Rendering(this.store.findObject(renderingUri, uris.HAS_DYMO));
    this.createControls();
    this.loadConstraints(renderingUri);
    this.loadNavigators(renderingUri, rendering);
    return [rendering, this.controls];
  }

  private loadConstraints(ownerUri: string) {
    let constraints = new ConstraintLoader(this.store).loadConstraints(ownerUri);
    constraints.forEach(c => c.maintain(this.store));
    this.constraints = this.constraints.concat(constraints);
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
      var currentControls = this.store.findAllSubjects(uris.TYPE, controlClasses[i]);
      for (var j = 0; j < currentControls.length; j++) {
        var currentName = this.store.findObjectValue(currentControls[j], uris.NAME);
        if (!currentName) {
          currentName = currentControls[j];
        }
        if (!this.controls[currentControls[j]]) {
          this.controls[currentControls[j]] = this.getControl(currentControls[j], currentName, controlClasses[i]);
        }
      }
    }
  }


  private getNavigator(type) {
    if (type == uris.SIMILARITY_NAVIGATOR) {
      return new SimilarityNavigator(undefined, this.store);
    } else if (type == uris.GRAPH_NAVIGATOR) {
      return new GraphNavigator(undefined, this.store);
    }
    return new SequentialNavigator(undefined, this.store);
  }

  private getControl(uri, name, type) {
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
      control.updateValue(init);
    } else if (type == uris.RANDOM) {
      control = new RandomControl(uri, this.store);
    } else if (type == uris.BROWNIAN) {
      var init = this.store.findObjectValue(uri, uris.VALUE);
      control = new BrownianControl(uri, init);
    } else if (type == uris.RAMP) {
      var milisDuration = Math.round(this.store.findObject(uri, uris.HAS_DURATION)*1000);
      var init = this.store.findObjectValue(uri, uris.VALUE);
      control = new RampControl(uri, milisDuration, init);
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
}