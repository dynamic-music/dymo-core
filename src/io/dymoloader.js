/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld into the given DymoStore
 * and creates the necessary controls, mappings, and renderings
 * @constructor
 * @param {DymoStore} dymoStore
 */
function DymoLoader(dymoStore) {

	var self = this;
	var dymoBasePath = '';
	var controls = {}; //dict with all the controls created
	var mappings = {};

	this.getMappings = function() {
		return mappings;
	}

	this.loadDymoFromJson = function(jsonUri, callback) {
		var fileIndex = jsonUri.lastIndexOf('/')+1;
		dymoBasePath = jsonUri.substring(0, fileIndex);
		loadJsonld(jsonUri, function() {
			callback(self.createDymoFromStore());
		});
	}

	this.parseDymoFromJson = function(json, callback) {
		dymoStore.loadData(json, true, function() {
			callback(self.createDymoFromStore());
		});
	}

	this.loadRenderingFromJson = function(jsonUri, callback) {
		loadJsonld(jsonUri, function() {
			callback(self.createRenderingFromStore());
		});
	}

	this.parseDymoFromTurtle = function(turtle, callback) {
		dymoStore.loadData(turtle, false, function() {
			callback(self.createDymoFromStore());
		});
	}

	//load jsonld into triple store
	function loadJsonld(jsonUri, callback) {
		recursiveLoadJson(jsonUri, "", function(loaded) {
			dymoStore.loadData(loaded, true, callback);
		});
	}

	function recursiveLoadJson(jsonUri, jsonString, callback) {
		loadFile(jsonUri, function(responseText) {
			if (responseText.indexOf("Cannot GET") < 0) {
				//console.log(this.responseText.substring(0,20), isJsonString(this.responseText))
				if (isJsonString(responseText)) {
					if (jsonString) {
						if (jsonUri.indexOf(dymoBasePath) >= 0) {
							jsonUri = jsonUri.replace(dymoBasePath, "");
						}
						jsonString = jsonString.replace('"'+jsonUri+'"', responseText);
					} else {
						jsonString = responseText;
					}
				}
				var nextUri = findNextJsonUri(jsonString);
				if (nextUri) {
					if (nextUri.indexOf(dymoBasePath) < 0) {
						nextUri = dymoBasePath+nextUri;
					}
					recursiveLoadJson(nextUri, jsonString, callback);
				} else if (jsonString) {
					callback(JSON.parse(jsonString));
				}
			}
		});
	}

	function isJsonString(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}

	function findNextJsonUri(jsonString) {
		var index = jsonString.indexOf(".json");
		if (index >= 0) {
			if (index != jsonString.indexOf("context.json")+7) {
				var before = jsonString.substring(0, index);
				var beginning = before.lastIndexOf('"');
				return jsonString.substring(beginning+1, index+5);
			} else {
				return findNextJsonUri(jsonString.substring(index+1));
			}
		}
	}

	this.createDymoFromStore = function() {
		var topDymos = [];
		//first create all dymos and save references in map
		var topDymoUris = dymoStore.findTopDymos();
		for (var i = 0; i < topDymoUris.length; i++) {
			dymoStore.addBasePath(topDymoUris[i], dymoBasePath)
			//create all dymo mappings
			loadMappings();
		}
		return topDymoUris;
	}

	this.createRenderingFromStore = function() {
		var renderingUri = dymoStore.findSubject(TYPE, RENDERING);
		var rendering = new Rendering(dymoStore.findObject(renderingUri, HAS_DYMO));
		loadMappings(renderingUri);
		loadNavigators(renderingUri, rendering);
		return [rendering, controls];
	}

	/** @param {string=} ownerUri (optional) */
	function loadMappings(ownerUri) {
		var mappingUris;
		if (ownerUri) {
			mappingUris = dymoStore.findAllObjects(ownerUri, HAS_MAPPING);
		} else {
			mappingUris = dymoStore.findAllSubjects(TYPE, MAPPING);
		}
		createControls();
		for (var i = 0; i < mappingUris.length; i++) {
			if (!mappings[mappingUris[i]]) {
				ownerUri = DYMO_STORE.findSubject(HAS_MAPPING, mappingUris[i]);
				mappings[mappingUris[i]] = createMapping(mappingUris[i], ownerUri);
			}
		}
	}

	function loadNavigators(renderingUri, rendering) {
		var navigators = dymoStore.findAllObjects(renderingUri, HAS_NAVIGATOR);
		for (var i = 0; i < navigators.length; i++) {
			var dymosFunction = createFunction(dymoStore.findObject(navigators[i], NAV_DYMOS));
			rendering.addSubsetNavigator(dymosFunction, getNavigator(dymoStore.findObject(navigators[i], TYPE)));
		}
	}

	function createControls() {
		var controlClasses = dymoStore.recursiveFindAllSubClasses(MOBILE_CONTROL);
		for (var i = 0; i < controlClasses.length; i++) {
			var currentControls = dymoStore.findAllSubjects(TYPE, controlClasses[i]);
			for (var j = 0; j < currentControls.length; j++) {
				var currentName = dymoStore.findObjectValue(currentControls[j], NAME);
				if (!currentName) {
					currentName = currentControls[j];
				}
				if (!controls[currentControls[j]]) {
					controls[currentControls[j]] = getControl(currentControls[j], currentName, controlClasses[i]);
				}
			}
		}
	}

	/** @param {string=} dymoUri (optional) */
	function createMapping(mappingUri, dymoUri) {
		var mappingFunctionUri = dymoStore.findObject(mappingUri, HAS_FUNCTION);
		var mappingFunction = createFunction(mappingFunctionUri, dymoUri);
		var targets = getTargets(mappingUri);
		var range = dymoStore.findObject(mappingUri, HAS_RANGE);
		return new Mapping(mappingFunction, targets, range);
	}

	function getTargets(mappingUri) {
		var targetUris = dymoStore.findAllObjects(mappingUri, TO_TARGET);
		if (targetUris.length > 0) {
			var targetFunction = createFunction(targetUris[0]);
			if (targetFunction) {
				return targetFunction;
			} else {
				return targetUris;
			}
		}
	}

	/** @param {string=} dymoUri (optional) */
	function createFunction(functionUri, dymoUri) {
		var [vars, args, body] = dymoStore.findFunction(functionUri);
		if (vars && args && body) {
			var argTypes;
			[args, argTypes] = createFunctionDomain(args, dymoUri);
			return new DymoFunction(vars, args, argTypes, body);
		}
	}

	function createFunctionDomain(domainDimUris, dymoUri) {
		var domainDims = [];
		var domainDimTypes = [];
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = dymoStore.findObject(domainDimUris[j], TYPE);
			if (currentType == FEATURE_TYPE || dymoStore.isSubtypeOf(currentType, FEATURE_TYPE)) {
				if (currentType == FEATURE_TYPE) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM FEATURES
					currentType = domainDimUris[j];
				}
				domainDims.push(currentType);
				domainDimTypes.push(FEATURE_TYPE);
			} else if (currentType == PARAMETER_TYPE || dymoStore.isSubclassOf(currentType, PARAMETER_TYPE)) {
				var currentParameter;
				if (currentType == CUSTOM_PARAMETER) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM PARAMETERS
					currentType = domainDimUris[j];
				}
				currentParameter = dymoUri ? dymoStore.setParameter(dymoUri, currentType) : domainDimUris[j];
				domainDims.push(currentParameter);
				domainDimTypes.push(PARAMETER_TYPE);
			} else {
				//it's a control
				domainDims.push(controls[domainDimUris[j]]);
				domainDimTypes.push(MOBILE_CONTROL);
			}
		}
		return [domainDims, domainDimTypes];
	}


	function getNavigator(type) {
		if (type == SIMILARITY_NAVIGATOR) {
			return new SimilarityNavigator(undefined);
		} else if (type == GRAPH_NAVIGATOR) {
			return new GraphNavigator(undefined);
		} else if (type == ONE_SHOT_NAVIGATOR) {
			return new OneShotNavigator(undefined);
		} else if (type == REPEATED_NAVIGATOR) {
			return new RepeatedNavigator(undefined);
		}
		return new SequentialNavigator(undefined);
	}

	function getControl(uri, name, type) {
		var control;
		if (type == ACCELEROMETER_X || type == ACCELEROMETER_Y || type == ACCELEROMETER_Z) {
			control = new AccelerometerControl(type);
		} else if (type == TILT_X || type == TILT_Y) {
			control = new TiltControl(type);
		} else if (type == GEOLOCATION_LATITUDE || type == GEOLOCATION_LONGITUDE) {
			control = new GeolocationControl(type);
		}	else if (type == GEOLOCATION_DISTANCE) {
			control = new DistanceControl();
		}	else if (type == COMPASS_HEADING) {
			control = new CompassControl();
		}	else if (type == BEACON) {
			var uuid = dymoStore.findObjectValue(uri, HAS_UUID);
			var major = dymoStore.findObjectValue(uri, HAS_MAJOR);
			var minor = dymoStore.findObjectValue(uri, HAS_MINOR);
			control = new BeaconControl(uuid, major, minor);
		}	else if (type == SLIDER || type == TOGGLE || type == BUTTON || type == CUSTOM_CONTROL) {
			control = new Control(uri, name, type);
			var init = dymoStore.findObjectValue(uri, HAS_INITIAL_VALUE);
			control.updateValue(init);
		} else if (type == RANDOM) {
			control = new RandomControl(uri);
		} else if (type == BROWNIAN) {
			var init = dymoStore.findObjectValue(uri, HAS_INITIAL_VALUE);
			control = new BrownianControl(uri, init);
		} else if (type == RAMP) {
			var milisDuration = Math.round(dymoStore.findObject(uri, HAS_DURATION)*1000);
			var init = dymoStore.findObjectValue(uri, HAS_INITIAL_VALUE);
			control = new RampControl(uri, milisDuration, init);
		}
		//TODO implement in better way (only works for sensor controls)
		if (dymoStore.findObjectValue(uri, IS_SMOOTH) && control.setSmooth) {
			control.setSmooth(true);
		}
		var average = dymoStore.findObjectValue(uri, IS_AVERAGE_OF);
		if (!isNaN(average) && control.setAverageOf) {
			control.setAverageOf(average);
		}
		return control;
	}

}
