import * as uris from '../globals/uris'
import { DymoStore } from '../io/dymostore'
import { Rendering } from '../model/rendering'
import { Mapping } from '../model/mapping'
import { DymoFunction } from '../model/function'
import { SequentialNavigator } from '../navigators/sequential'
import { SimilarityNavigator } from '../navigators/similarity'
import { GraphNavigator } from '../navigators/graph'
import { Control } from '../model/control'
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

/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld into the given DymoStore
 * and creates the necessary controls, mappings, and renderings
 * @constructor
 * @param {DymoStore} dymoStore
 */
export class DymoLoader {

	private dymoStore: DymoStore;
	private dymoBasePath = '';
	private controls = {}; //dict with all the controls created
	private mappings = {};

	constructor(dymoStore) {
		this.dymoStore = dymoStore;
	}

	getMappings() {
		return this.mappings;
	}

	loadDymoFromJson(jsonUri): Promise<string[]> {
		var fileIndex = jsonUri.lastIndexOf('/')+1;
		this.dymoBasePath = jsonUri.substring(0, fileIndex);
		return this.loadJsonld(jsonUri)
			.then(() => this.createDymoFromStore());
	}

	parseDymoFromJson(json): Promise<string[]> {
		return this.dymoStore.loadData(json, true)
			.then(() => this.createDymoFromStore());
	}

	loadRenderingFromJson(jsonUri): Promise<Object[]> {
		return this.loadJsonld(jsonUri)
			.then(() => this.createRenderingFromStore());
	}

	parseDymoFromTurtle(turtle): Promise<string[]> {
		return this.dymoStore.loadData(turtle, false)
			.then(() => this.createDymoFromStore());
	}

	//load jsonld into triple store
	private loadJsonld(jsonUri): Promise<any> {
		return new Promise(resolve =>
			this.recursiveLoadJson(jsonUri, "", loaded => {
				this.dymoStore.loadData(loaded, true)
					.then(() => resolve())
			})
		);
	}

	private recursiveLoadJson(jsonUri, jsonString, callback) {
		fetch(jsonUri, { mode:'cors' })
		.then(response => response.text())
		.then(text => {
			if (text.indexOf("Cannot GET") < 0) {
				//console.log(this.responseText.substring(0,20), isJsonString(this.responseText))
				if (this.isJsonString(text)) {
					if (jsonString) {
						if (jsonUri.indexOf(this.dymoBasePath) >= 0) {
							jsonUri = jsonUri.replace(this.dymoBasePath, "");
						}
						jsonString = jsonString.replace('"'+jsonUri+'"', text);
					} else {
						jsonString = text;
					}
				}
				var nextUri = this.findNextJsonUri(jsonString);
				if (nextUri) {
					if (nextUri.indexOf(this.dymoBasePath) < 0) {
						nextUri = this.dymoBasePath+nextUri;
					}
					this.recursiveLoadJson(nextUri, jsonString, callback);
				} else if (jsonString) {
					callback(JSON.parse(jsonString));
				}
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
		var topDymoUris = this.dymoStore.findTopDymos();
		for (var i = 0; i < topDymoUris.length; i++) {
			this.dymoStore.addBasePath(topDymoUris[i], this.dymoBasePath)
			//create all dymo mappings
			this.loadMappings();
		}
		return topDymoUris;
	}

	createRenderingFromStore(): Object[] {
		var renderingUri = this.dymoStore.findSubject(uris.TYPE, uris.RENDERING);
		var rendering = new Rendering(this.dymoStore.findObject(renderingUri, uris.HAS_DYMO));
		this.loadMappings(renderingUri);
		this.loadNavigators(renderingUri, rendering);
		return [rendering, this.controls];
	}

	private loadMappings(ownerUri?) {
		var mappingUris;
		if (ownerUri) {
			mappingUris = this.dymoStore.findAllObjects(ownerUri, uris.HAS_MAPPING);
		} else {
			mappingUris = this.dymoStore.findAllSubjects(uris.TYPE, uris.MAPPING);
		}
		this.createControls();
		for (var i = 0; i < mappingUris.length; i++) {
			if (!this.mappings[mappingUris[i]]) {
				var dymoUri = this.dymoStore.findSubject(uris.HAS_MAPPING, mappingUris[i]);
				if (this.dymoStore.findObject(dymoUri, uris.TYPE) != uris.DYMO) {
					dymoUri = null;
				}
				this.mappings[mappingUris[i]] = this.createMapping(mappingUris[i], dymoUri);
			}
		}
	}

	private loadNavigators(renderingUri, rendering) {
		var navigators = this.dymoStore.findAllObjects(renderingUri, uris.HAS_NAVIGATOR);
		for (var i = 0; i < navigators.length; i++) {
			var dymosFunction = this.createFunction(this.dymoStore.findObject(navigators[i], uris.NAV_DYMOS), true);
			rendering.addSubsetNavigator(dymosFunction, this.getNavigator(this.dymoStore.findObject(navigators[i], uris.TYPE)));
		}
	}

	private createControls() {
		var controlClasses = this.dymoStore.recursiveFindAllSubClasses(uris.MOBILE_CONTROL);
		for (var i = 0; i < controlClasses.length; i++) {
			var currentControls = this.dymoStore.findAllSubjects(uris.TYPE, controlClasses[i]);
			for (var j = 0; j < currentControls.length; j++) {
				var currentName = this.dymoStore.findObjectValue(currentControls[j], uris.NAME);
				if (!currentName) {
					currentName = currentControls[j];
				}
				if (!this.controls[currentControls[j]]) {
					this.controls[currentControls[j]] = this.getControl(currentControls[j], currentName, controlClasses[i]);
				}
			}
		}
	}

	private createMapping(mappingUri, dymoUri?) {
		var isUnidirectional = this.dymoStore.findObjectValue(mappingUri, uris.IS_UNIDIRECTIONAL);
		var mappingFunctionUri = this.dymoStore.findObject(mappingUri, uris.HAS_FUNCTION);
		var mappingFunction = this.createFunction(mappingFunctionUri, isUnidirectional, dymoUri);
		var targets = this.getTargets(mappingUri);
		var range = this.dymoStore.findObject(mappingUri, uris.HAS_RANGE);
		return new Mapping(mappingFunction, targets, range, isUnidirectional);
	}

	private getTargets(mappingUri) {
		var targetUris = this.dymoStore.findAllObjects(mappingUri, uris.TO_TARGET);
		if (targetUris.length > 0) {
			var targetFunction = this.createFunction(targetUris[0], true);
			if (targetFunction) {
				return targetFunction;
			} else {
				return targetUris;
			}
		}
	}

	private createFunction(functionUri, isUnidirectional, dymoUri?) {
		var [vars, args, body] = this.dymoStore.findFunction(functionUri);
		if (vars && args && body) {
			var argTypes;
			[args, argTypes] = this.createFunctionDomain(args, dymoUri);
			return new DymoFunction(vars, args, argTypes, body, isUnidirectional);
		}
	}

	private createFunctionDomain(domainDimUris, dymoUri) {
		var domainDims = [];
		var domainDimTypes = [];
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = this.dymoStore.findObject(domainDimUris[j], uris.TYPE);
			//console.log(domainDimUris[j], currentType)
			if (currentType === uris.FEATURE_TYPE || this.dymoStore.isSubclassOf(currentType, uris.FEATURE_TYPE)) {
				if (currentType === uris.FEATURE_TYPE) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM FEATURES
					currentType = domainDimUris[j];
				}
				domainDims.push(currentType);
				domainDimTypes.push(uris.FEATURE_TYPE);
			} else if (currentType === uris.PARAMETER_TYPE || this.dymoStore.isSubclassOf(currentType, uris.PARAMETER_TYPE)
						|| this.dymoStore.isSubclassOf(this.dymoStore.findObject(currentType, uris.TYPE), uris.PARAMETER_TYPE)) {
				var currentParameter;
				if (currentType === uris.CUSTOM_PARAMETER) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM PARAMETERS
					currentType = domainDimUris[j];
				}
				currentParameter = dymoUri ? this.dymoStore.setParameter(dymoUri, currentType) : domainDimUris[j];
				domainDims.push(currentParameter);
				domainDimTypes.push(uris.PARAMETER_TYPE);
			} else {
				//it's a control
				domainDims.push(this.controls[domainDimUris[j]]);
				domainDimTypes.push(uris.MOBILE_CONTROL);
			}
		}
		return [domainDims, domainDimTypes];
	}


	private getNavigator(type) {
		if (type == uris.SIMILARITY_NAVIGATOR) {
			return new SimilarityNavigator(undefined);
		} else if (type == uris.GRAPH_NAVIGATOR) {
			return new GraphNavigator(undefined);
		}
		return new SequentialNavigator(undefined);
	}

	private getControl(uri, name, type) {
		var control;
		if (type == uris.ACCELEROMETER_X || type == uris.ACCELEROMETER_Y || type == uris.ACCELEROMETER_Z) {
			control = new AccelerometerControl(type);
		} else if (type == uris.TILT_X || type == uris.TILT_Y) {
			control = new TiltControl(type);
		} else if (type == uris.GEOLOCATION_LATITUDE || type == uris.GEOLOCATION_LONGITUDE) {
			control = new GeolocationControl(type);
		}	else if (type == uris.GEOLOCATION_DISTANCE) {
			control = new DistanceControl();
		}	else if (type == uris.COMPASS_HEADING) {
			control = new CompassControl();
		}	else if (type == uris.BEACON) {
			var uuid = this.dymoStore.findObjectValue(uri, uris.HAS_UUID);
			var major = this.dymoStore.findObjectValue(uri, uris.HAS_MAJOR);
			var minor = this.dymoStore.findObjectValue(uri, uris.HAS_MINOR);
			control = new BeaconControl(uuid, major, minor);
		}	else if (type == uris.SLIDER || type == uris.TOGGLE || type == uris.BUTTON || type == uris.CUSTOM_CONTROL) {
			control = new Control(uri, name, type);
			var init = this.dymoStore.findObjectValue(uri, uris.HAS_INITIAL_VALUE);
			control.updateValue(init);
		} else if (type == uris.RANDOM) {
			control = new RandomControl(uri);
		} else if (type == uris.BROWNIAN) {
			var init = this.dymoStore.findObjectValue(uri, uris.HAS_INITIAL_VALUE);
			control = new BrownianControl(uri, init);
		} else if (type == uris.RAMP) {
			var milisDuration = Math.round(this.dymoStore.findObject(uri, uris.HAS_DURATION)*1000);
			var init = this.dymoStore.findObjectValue(uri, uris.HAS_INITIAL_VALUE);
			control = new RampControl(uri, milisDuration, init);
		} else if (type == uris.DATA_CONTROL) {
			var url = this.dymoStore.findObjectValue(uri, uris.HAS_URL);
			var jsonMapString = String(this.dymoStore.findObjectValue(uri, uris.HAS_JSON_MAP));
			var jsonMap = new Function("json", jsonMapString);
			control = new DataControl(uri, url, jsonMap);
		}
		//TODO implement in better way (only works for sensor controls)
		if (this.dymoStore.findObjectValue(uri, uris.IS_SMOOTH) && control.setSmooth) {
			control.setSmooth(true);
		}
		var average = this.dymoStore.findObjectValue(uri, uris.IS_AVERAGE_OF);
		if (!isNaN(Number(average)) && control.setAverageOf) {
			control.setAverageOf(average);
		}
		return control;
	}

}
