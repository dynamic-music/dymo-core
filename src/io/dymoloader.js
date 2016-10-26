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

	/*this.loadGraphFromJson = function(jsonUri, callback) {
		recursiveLoadJson(jsonUri, "", function(json) {
			callback(createGraphFromJson(json));
		});
	}*/

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
			var dymoUris = dymoStore.findAllObjectsInHierarchy(topDymoUris[i]);
			var mappingResults = dymoStore.find(null, HAS_MAPPING);
			for (var i = 0; i < mappingResults.length; i++) {
				var dymoUri = mappingResults[i].subject;
				if (dymoUris.indexOf(dymoUri) >= 0) {
					var mappingUri = mappingResults[i].object
					createControls(mappingUri);
					mappings[mappingUri] = createMapping(mappingUri, dymoUri);
				}
			}
		}
		return topDymoUris;
	}

	/*function recursiveCreateDymoAndParts(currentDymoUri) {
		var cdt = dymoStore.findObject(currentDymoUri, CDT);
		var dymo = new DynamicMusicObject(currentDymoUri, cdt, scheduler);
		dymoStore.addBasePath(currentDymoUri, dymoBasePath)
		console.log()
		//dymo.setBasePath(dymoBasePath);
		dymos[currentDymoUri] = dymo;
		//dymo.setSourcePath(dymoStore.findObjectValue(currentDymoUri, HAS_SOURCE));
		/*var featureUris = store.findAllObjects(currentDymoUri, HAS_FEATURE);
		for (var i = 0; i < featureUris.length; i++) {
			var type = store.findObject(featureUris[i], TYPE);
			dymo.setFeature(store.findObject(featureUris[i], TYPE), store.findObjectValue(featureUris[i], VALUE));
		}*/
		/*var parameters = dymoStore.findAllObjects(currentDymoUri, HAS_PARAMETER);
		for (var i = 0; i < parameters.length; i++) {
			addDymoParameter(dymo, dymoStore.findObject(parameters[i], TYPE), dymoStore.findObjectValue(parameters[i], VALUE));
		}*/
		/*var parts = dymoStore.findParts(currentDymoUri);
		for (var i = 0; i < parts.length; i++) {
			dymo.addPart(recursiveCreateDymoAndParts(parts[i]));
		}
		return dymo;
	}*/

	/*function recursiveAddMappingsAndSimilars(currentDymoUri) {
		var dymo = dymos[currentDymoUri];
		//first add similars
		var similars = dymoStore.findAllObjects(currentDymoUri, HAS_SIMILAR);
		for (var i = 0; i < similars.length; i++) {
			dymo.addSimilar(dymos[similars[i]]);
		}
		//then successors
		var successors = dymoStore.findAllObjects(currentDymoUri, HAS_SUCCESSOR);
		for (var i = 0; i < successors.length; i++) {
			dymo.addSuccessor(dymos[successors[i]]);
		}
		//then add mappings
		var mappingUris = dymoStore.findAllObjects(currentDymoUri, HAS_MAPPING);
		createControls(mappingUris);
		for (var i = 0; i < mappingUris.length; i++) {
			dymo.addMapping(createMapping(mappingUris[i], dymo));
		}
		//iterate through parts
		var parts = dymoStore.findParts(currentDymoUri);
		for (var i = 0; i < parts.length; i++) {
			recursiveAddMappingsAndSimilars(parts[i]);
		}
	}*/

	this.createRenderingFromStore = function() {
		var renderingUri = dymoStore.findSubject(TYPE, RENDERING);
		var rendering = new Rendering(dymoStore.findObject(renderingUri, HAS_DYMO));
		var mappingUris = dymoStore.findAllObjects(renderingUri, HAS_MAPPING);
		createControls(mappingUris);

		for (var i = 0; i < mappingUris.length; i++) {
			rendering.addMapping(createMapping(mappingUris[i]));
		}
		var navigators = dymoStore.findAllObjects(renderingUri, HAS_NAVIGATOR);
		for (var i = 0; i < navigators.length; i++) {
			var dymosFunction = dymoStore.findObject(navigators[i], NAV_DYMOS);
			dymosFunction = dymoStore.findFunction(dymosFunction);
			rendering.addSubsetNavigator(dymosFunction, getNavigator(dymoStore.findObject(navigators[i], TYPE)));
		}
		return [rendering, controls];
	}

	function createControls(mappingUris) {
		for (var i = 0; i < mappingUris.length; i++) {
			var domainDimUris = dymoStore.findAllObjects(mappingUris[i], HAS_DOMAIN_DIMENSION);
			for (var j = 0; j < domainDimUris.length; j++) {
				var currentType = dymoStore.findObject(domainDimUris[j], TYPE);
				var currentName = dymoStore.findObjectValue(domainDimUris[j], NAME);
				if (!currentName) {
					currentName = domainDimUris[j];
				}
				if (dymoStore.isSubclassOf(currentType, MOBILE_CONTROL)) {
					if (!controls[domainDimUris[j]]) {
						var control = getControl(domainDimUris[j], currentName, currentType);
						controls[domainDimUris[j]] = control;
					}
				}
			}
		}
	}

	/** @param {string=} dymoUri (optional) */
	function createMapping(mappingUri, dymoUri) {
		var targetUris = dymoStore.findAllObjects(mappingUri, TO_TARGET);
		if (targetUris.length > 0) {
			var targets = [];
			var constraintFunction = dymoStore.findFunction(targetUris[0]);
			if (constraintFunction) {
				//TODO: REWRITE!!!!!
				var allDymos = dymoStore.findAllSubjectUris(TYPE, DYMO);//Object.keys(dymos)//.map(function(key) { return dymos[key]; });
				Array.prototype.push.apply(targets, allDymos);//.filter(constraintFunction));
			} else {
				for (var j = 0; j < targetUris.length; j++) {
					targets.push(targetUris[j]);
					/*var targetType = dymoStore.findObject(targetUris[j], TYPE);
					if (targetType == DYMO) {
						targets.push(dymos[targetUris[j]]);
					} else {
						//it's a control
						targets.push(controls[targetUris[j]]);
					}*/
				}
			}
			//console.log(mappingUri, dymo, targets, controls, constraintFunction)
			return createMappingToObjects(mappingUri, dymoUri, targets, constraintFunction);
		} else {
			return createMappingToObjects(mappingUri, dymoUri, []);
		}
	}

	/** @param {Function=} dymoConstraint (optional) */
	function createMappingToObjects(mappingUri, dymoUri, targets, dymoConstraint) {
		var isRelative = dymoStore.findObject(mappingUri, IS_RELATIVE);
		var domainDims = [];
		var domainDimUris = dymoStore.findAllObjects(mappingUri, HAS_DOMAIN_DIMENSION);
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = dymoStore.findObject(domainDimUris[j], TYPE);
			if (currentType == FEATURE_TYPE || dymoStore.isSubtypeOf(currentType, FEATURE_TYPE)) {
				if (currentType == FEATURE_TYPE) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM FEATURES
					currentType = domainDimUris[j];
				}
				domainDims.push(currentType);
			} else if (currentType == PARAMETER_TYPE || dymoStore.isSubclassOf(currentType, PARAMETER_TYPE)) {
				var currentParameter;
				if (currentType == CUSTOM_PARAMETER) { //TODO MAYBE FIND BETTER SOLUTION TO DEAL WITH CUSTOM PARAMETERS
					currentType = domainDimUris[j];
				}
				if (dymoUri) {
					currentParameter = dymoStore.setParameter(dymoUri, currentType);
				} else {
					currentParameter = dymoStore.setParameter(null, currentType);
				}
				domainDims.push(currentParameter);
			} else {
				//it's a control
				domainDims.push(controls[domainDimUris[j]]);
			}
		}
		var [args, body] = dymoStore.findArgsAndBody(dymoStore.findObject(mappingUri, HAS_FUNCTION));
		var range = dymoStore.findObject(mappingUri, HAS_RANGE);
		/*//add necessary parameters to targets if they are dymos
		for (var i = 0; i < targets.length; i++) {
			if (targets[i] instanceof DynamicMusicObject && !targets[i].getParameter(range)) {
				addDymoParameter(targets[i], range);
			}
		}*/
		//console.log(domainDims, isRelative, {"args":args,"body":body}, targets, range, dymoConstraint)
		return new Mapping(domainDims, isRelative, {"args":args,"body":body}, targets, range, dymoConstraint);
	}

	/*//currently only works for generically named dymos
	function createGraphFromJson(json) {
		for (var i = 0; i < json.length; i++) {
			if (json[i]) {
				for (var j = 0; j < json[i].length; j++) {
					var dymo = dymos[CONTEXT_URI+"dymo"+i];
					var similarDymo = dymos[CONTEXT_URI+"dymo"+json[i][j]];
					if (dymo && similarDymo) {
						dymo.addSimilar(similarDymo);
					}
				}
			}
		}
	}*/

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
			control.update(init);
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
