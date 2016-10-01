/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld.
 * @constructor
 * @param {Function=} callback (optional)
 */
function DymoLoader(scheduler, callback) {
	
	var self = this;
	
	var store = new DymoStore(callback);
	var dymoBasePath = '';
	var controls = {}, dymos = {}; //dicts with all the objects created
	
	this.setStore = function(newStore) {
		store = newStore;
	}
	
	this.getStore = function() {
		return store;
	}
	
	this.loadDymoFromJson = function(jsonUri, callback) {
		var fileIndex = jsonUri.lastIndexOf('/')+1;
		dymoBasePath = jsonUri.substring(0, fileIndex);
		loadJsonld(jsonUri, function() {
			callback(self.createDymoFromStore());
		});
	}
	
	this.parseDymoFromJson = function(json, callback) {
		store.loadData(json, true, function() {
			callback(self.createDymoFromStore());
		});
	}
	
	this.loadRenderingFromJson = function(jsonUri, callback) {
		loadJsonld(jsonUri, function() {
			callback(self.createRenderingFromStore());
		});
	}
	
	this.loadGraphFromJson = function(jsonUri, callback) {
		recursiveLoadJson(jsonUri, "", function(json) {
			callback(createGraphFromJson(json));
		});
	}
	
	//load jsonld into triple store
	function loadJsonld(jsonUri, callback) {
		recursiveLoadJson(jsonUri, "", function(loaded) {
			store.loadData(loaded, true, callback);
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
		var topDymoUris = store.findTopDymos();
		for (var i = 0; i < topDymoUris.length; i++) {
			topDymos.push(recursiveCreateDymoAndParts(topDymoUris[i]));
			//then add similarity relations
			recursiveAddMappingsAndSimilars(topDymoUris[i]);
		}
		return [topDymos, dymos]; //for now topDymo is just the last one loaded ~
	}
	
	function recursiveCreateDymoAndParts(currentDymoUri) {
		var cdt = store.findFirstObjectUri(currentDymoUri, CDT);
		var dymo = new DynamicMusicObject(currentDymoUri, cdt, scheduler);
		dymo.setBasePath(dymoBasePath);
		dymos[currentDymoUri] = dymo;
		dymo.setSourcePath(store.findFirstObjectValue(currentDymoUri, HAS_SOURCE));
		var featureUris = store.findAllObjectUris(currentDymoUri, HAS_FEATURE);
		for (var i = 0; i < featureUris.length; i++) {
			var type = store.findFirstObjectUri(featureUris[i], TYPE);
			dymo.setFeature(store.findFirstObjectUri(featureUris[i], TYPE), store.findFeatureValue(featureUris[i]));
		}
		var parameters = store.findAllObjectUris(currentDymoUri, HAS_PARAMETER);
		for (var i = 0; i < parameters.length; i++) {
			addOrUpdateDymoParameter(dymo, store.findFirstObjectUri(parameters[i], TYPE), store.findFirstObjectValue(parameters[i], VALUE));
		}
		var parts = store.findParts(currentDymoUri);
		for (var i = 0; i < parts.length; i++) {
			dymo.addPart(recursiveCreateDymoAndParts(parts[i]));
		}
		return dymo;
	}
	
	function recursiveAddMappingsAndSimilars(currentDymoUri) {
		var dymo = dymos[currentDymoUri];
		//first add similars
		var similars = store.findAllObjectUris(currentDymoUri, HAS_SIMILAR);
		for (var i = 0; i < similars.length; i++) {
			dymo.addSimilar(dymos[similars[i]]);
		}
		//then successors
		var successors = store.findAllObjectUris(currentDymoUri, HAS_SUCCESSOR);
		for (var i = 0; i < successors.length; i++) {
			dymo.addSuccessor(dymos[successors[i]]);
		}
		//then add mappings
		var mappingUris = store.findAllObjectUris(currentDymoUri, HAS_MAPPING);
		createControls(mappingUris);
		for (var i = 0; i < mappingUris.length; i++) {
			dymo.addMapping(createMapping(mappingUris[i], dymo));
		}
		//iterate through parts
		var parts = store.findParts(currentDymoUri);
		for (var i = 0; i < parts.length; i++) {
			recursiveAddMappingsAndSimilars(parts[i]);
		}
	}
	
	this.createRenderingFromStore = function() {
		var renderingUri = store.findFirstSubjectUri(TYPE, RENDERING);
		var rendering = new Rendering(dymos[store.findFirstObjectUri(renderingUri, HAS_DYMO)]);
		var mappingUris = store.findAllObjectUris(renderingUri, HAS_MAPPING);
		createControls(mappingUris);
		
		for (var i = 0; i < mappingUris.length; i++) {
			rendering.addMapping(createMapping(mappingUris[i]));
		}
		var navigators = store.findAllObjectUris(renderingUri, HAS_NAVIGATOR);
		for (var i = 0; i < navigators.length; i++) {
			var dymosFunction = store.findFirstObjectUri(navigators[i], NAV_DYMOS);
			dymosFunction = store.findFunction(dymosFunction);
			rendering.addSubsetNavigator(dymosFunction, getNavigator(store.findFirstObjectUri(navigators[i], TYPE)));
		}
		return [rendering, controls];
	}
	
	function createControls(mappingUris) {
		for (var i = 0; i < mappingUris.length; i++) {
			var domainDimUris = store.findAllObjectUris(mappingUris[i], HAS_DOMAIN_DIMENSION);
			for (var j = 0; j < domainDimUris.length; j++) {
				var currentType = store.findFirstObjectUri(domainDimUris[j], TYPE);
				var currentName = store.findFirstObjectValue(domainDimUris[j], NAME);
				if (!currentName) {
					currentName = domainDimUris[j];
				}
				if (store.isSubclassOf(currentType, MOBILE_CONTROL)) {
					if (!controls[domainDimUris[j]]) {
						var control = getControl(domainDimUris[j], currentName, currentType);
						controls[domainDimUris[j]] = control;
					}
				}
			}
		}
	}
	
	/** @param {Object=} dymo (optional) */
	function createMapping(mappingUri, dymo) {
		var targetUris = store.findAllObjectUris(mappingUri, TO_TARGET);
		if (targetUris.length > 0) {
			var targets = [];
			var constraintFunction = store.findFunction(targetUris[0]);
			if (constraintFunction) {
				var allDymos = Object.keys(dymos).map(function(key) { return dymos[key]; });
				Array.prototype.push.apply(targets, allDymos.filter(constraintFunction));
			} else {
				for (var j = 0; j < targetUris.length; j++) {
					var targetType = store.findFirstObjectUri(targetUris[j], TYPE);
					if (targetType == DYMO) {
						targets.push(dymos[targetUris[j]]);
					} else {
						//it's a control
						targets.push(controls[targetUris[j]]);
					}
				}
			}
			//console.log(mappingUri, dymo, targets, controls, constraintFunction)
			return createMappingToObjects(mappingUri, dymo, targets, constraintFunction);
		} else {
			return createMappingToObjects(mappingUri, dymo, [scheduler]);
		}
	}
	
	/** @param {Function=} dymoConstraint (optional) */
	function createMappingToObjects(mappingUri, dymo, targets, dymoConstraint) {
		var isRelative = store.findFirstObjectUri(mappingUri, IS_RELATIVE);
		var domainDims = [];
		var domainDimUris = store.findAllObjectUris(mappingUri, HAS_DOMAIN_DIMENSION);
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = store.findFirstObjectUri(domainDimUris[j], TYPE);
			var currentName = store.findFirstObjectValue(domainDimUris[j], NAME);
			if (!currentName) {
				currentName = domainDimUris[j];
			}
			if (currentType == FEATURE_TYPE || store.isSubclassOf(currentType, FEATURE_TYPE)) {
				domainDims.push(currentName);
			} else if (currentType == PARAMETER_TYPE || store.isSubclassOf(currentType, PARAMETER_TYPE)) {
				var currentParameter;
				if (dymo) {
					currentParameter = addOrUpdateDymoParameter(dymo, currentName);
				} else {
					currentParameter = new Parameter(currentName, 0);
				}
				domainDims.push(currentParameter);
			} else {
				//it's a control
				domainDims.push(controls[domainDimUris[j]]);
			}
		}
		var [args, body] = store.findArgsAndBody(store.findFirstObjectUri(mappingUri, HAS_FUNCTION));
		var range = store.findFirstObjectUri(mappingUri, HAS_RANGE);
		//add necessary parameters to targets if they are dymos
		for (var i = 0; i < targets.length; i++) {
			if (targets[i] instanceof DynamicMusicObject && !targets[i].getParameter(range)) {
				addOrUpdateDymoParameter(targets[i], range);
			}
		}
		return new Mapping(domainDims, isRelative, {"args":args,"body":body}, targets, range, dymoConstraint);
	}
	
	/** @param {number=} value (optional) */
	function addOrUpdateDymoParameter(dymo, name, value) {
		var currentParameter = dymo.getParameter(name);
		if (!currentParameter) {
			if (isNaN(value)) {
				value = store.findFirstObjectValue(name, HAS_STANDARD_VALUE, null);
				if (isNaN(value)) {
					value = 0;
				}
			}
			var isInteger = store.findFirstObjectValue(name, IS_INTEGER, null);
			currentParameter = new Parameter(name, value, isInteger);
			dymo.addParameter(currentParameter);
		} else {
			currentParameter.update(value);
		}
		return currentParameter;
	}
	
	//currently only works for generically named dymos
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
	
	function getControl(id, name, type) {
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
			var uuid = store.findFirstObjectValue(id, HAS_UUID);
			var major = store.findFirstObjectValue(id, HAS_MAJOR);
			var minor = store.findFirstObjectValue(id, HAS_MINOR);
			control = new BeaconControl(uuid, major, minor);
		}	else if (type == SLIDER || type == TOGGLE || type == BUTTON || type == CUSTOM_CONTROL) {
			control = new Control(name, type);
			var init = store.findFirstObjectValue(id, HAS_INITIAL_VALUE);
			control.update(init);
		} else if (type == RANDOM) {
			control = new RandomControl();
		} else if (type == BROWNIAN) {
			var init = store.findFirstObjectValue(id, HAS_INITIAL_VALUE);
			control = new BrownianControl(init);
		} else if (type == RAMP) {
			var milisDuration = Math.round(store.findFirstObjectUri(id, HAS_DURATION)*1000);
			var init = store.findFirstObjectValue(id, HAS_INITIAL_VALUE);
			control = new RampControl(milisDuration, init);
		}
		//TODO implement in better way (only works for sensor controls)
		if (store.findFirstObjectValue(id, IS_SMOOTH) && control.setSmooth) {
			control.setSmooth(true);
		}
		var average = store.findFirstObjectValue(id, IS_AVERAGE_OF);
		if (!isNaN(average) && control.setAverageOf) {
			control.setAverageOf(average);
		}
		return control;
	}

}