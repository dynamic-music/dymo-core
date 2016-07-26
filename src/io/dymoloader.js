/**
 * A DymoLoader loads dymos from rdf, jams, or json-ld.
 * @constructor
 */
function DymoLoader(scheduler, callback) {
	
	var store = new EasyStore();
	var dymoBasePath = '';
	
	initStore();
	
	//creates the store and loads some basic ontology files
	function initStore() {
		loadFileIntoStore("http://tiny.cc/dymo-ontology", false, function() {
			loadFileIntoStore("http://tiny.cc/mobile-audio-ontology", false, function() {
				if (callback) {
					callback();
				}
			});
		});
	}
	
	this.getStore = function() {
		return store;
	}
	
	this.loadDymoFromJson = function(jsonUri, callback) {
		var fileIndex = jsonUri.lastIndexOf('/')+1;
		dymoBasePath = jsonUri.substring(0, fileIndex);
		loadJsonld(jsonUri, function() {
			callback(createDymoFromStore({}));
		});
	}
	
	this.parseDymoFromJson = function(json, callback) {
		store.loadData(json, true, function() {
			callback(createDymoFromStore({}));
		});
	}
	
	this.loadRenderingFromJson = function(jsonUri, dymoMap, callback) {
		if (!dymoMap) {
			dymoMap = {};
		}
		loadJsonld(jsonUri, function() {
			callback(createRendering(dymoMap));
		});
	}
	
	this.loadGraphFromJson = function(jsonUri, dymoMap, callback) {
		recursiveLoadJson(jsonUri, "", function(json) {
			callback(createGraphFromJson(json, dymoMap));
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
	
	function createDymoFromStore(dymoMap) {
		//first create all dymos and save references in map
		var topDymoUri = findTopDymos()[0];
		var topDymo = recursiveCreateDymoAndParts(topDymoUri, dymoMap);
		//then add similarity relations
		recursiveAddMappingsAndSimilars(topDymoUri, dymoMap);
		return [topDymo, dymoMap];
	}
	
	//returns an array with all uris of dymos that do not have parents
	function findTopDymos() {
		var allPartTriples = store.find(null, HAS_PART, null);
		var allParents = Array.from(new Set(allPartTriples.map(function(t){return t.subject;})), x => x);
		var allParts = Array.from(new Set(allPartTriples.map(function(t){return t.object;})), x => x);
		return allParents.filter(function(p) { return allParts.indexOf(p) < 0 });
	}
	
	function findFunction(uri) {
		var [args, body] = findArgsAndBody(uri);
		if (args && body) {
			return Function.apply(null, args.concat(body));
		}
	}
	
	function findArgsAndBody(uri) {
		var args = store.findAllObjectValues(uri, HAS_ARGUMENT);
		var body = store.findFirstObjectValue(uri, HAS_BODY);
		return [args, body];
	}
	
	function recursiveCreateDymoAndParts(currentDymoUri, dymoMap) {
		var cdt = store.findFirstObjectUri(currentDymoUri, CDT);
		var dymo = new DynamicMusicObject(currentDymoUri, cdt, scheduler);
		dymo.setBasePath(dymoBasePath);
		dymoMap[currentDymoUri] = dymo;
		dymo.setSourcePath(store.findFirstObjectValue(currentDymoUri, HAS_SOURCE));
		var features = store.findAllObjectUris(currentDymoUri, HAS_FEATURE);
		for (var i = 0; i < features.length; i++) {
			dymo.setFeature(features[i], store.findFirstObjectUri(features[i], VALUE));
		}
		var parameters = store.findAllObjectUris(currentDymoUri, HAS_PARAMETER);
		for (var i = 0; i < parameters.length; i++) {
			addOrUpdateDymoParameter(dymo, store.findFirstObjectUri(parameters[i], TYPE), store.findFirstObjectValue(parameters[i], VALUE));
		}
		var parts = store.findAllObjectUris(currentDymoUri, HAS_PART);
		for (var i = 0; i < parts.length; i++) {
			dymo.addPart(recursiveCreateDymoAndParts(parts[i], dymoMap));
		}
		return dymo;
	}
	
	function recursiveAddMappingsAndSimilars(currentDymoUri, dymoMap) {
		var dymo = dymoMap[currentDymoUri];
		//first add similars
		var similars = store.findAllObjectUris(currentDymoUri, HAS_SIMILAR);
		for (var i = 0; i < similars.length; i++) {
			dymo.addSimilar(dymoMap[similars[i]]);
		}
		//then add mappings
		var mappings = store.findAllObjectUris(currentDymoUri, HAS_MAPPING);
		for (var i = 0; i < mappings.length; i++) {
			dymo.addMapping(createMapping(mappings[i], dymoMap, dymo));
		}
		//iterate through parts
		var parts = store.findAllObjectUris(currentDymoUri, HAS_PART);
		for (var i = 0; i < parts.length; i++) {
			recursiveAddMappingsAndSimilars(parts[i], dymoMap);
		}
	}
	
	function createRendering(dymoMap) {
		var renderingUri = store.findFirstSubjectUri(TYPE, RENDERING);
		var rendering = new Rendering(dymoMap[store.findFirstObjectUri(renderingUri, HAS_DYMO)]);
		var mappingUris = store.findAllObjectUris(renderingUri, HAS_MAPPING);
		var controls = createControls(mappingUris);
		
		for (var i = 0; i < mappingUris.length; i++) {
			rendering.addMapping(createMapping(mappingUris[i], dymoMap, undefined, controls));
		}
		var navigator = store.findFirstObjectUri(renderingUri, HAS_NAVIGATOR);
		if (navigator) {
			var dymosFunction = store.findFirstObjectUri(navigator, TO_DYMO);
			dymosFunction = findFunction(dymosFunction);
			rendering.addNavigator(getNavigator(store.findFirstObjectUri(navigator, TYPE)), dymosFunction);
		}
		return [rendering, controls];
	}
	
	function createControls(mappingUris) {
		var controls = {};
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
						var value = Number(store.findFirstObjectUri(domainDimUris[j], VALUE));
						if (!isNaN(value)) {
							control.update(value);
						}
						controls[domainDimUris[j]] = control;
					}
				}
			}
		}
		return controls;
	}
	
	/** @param {Object=} controls (optional) */
	function createMapping(mappingUri, dymoMap, dymo, controls) {
		var targetUris = store.findAllObjectUris(mappingUri, TO_TARGET);
		var dymoUris = store.findAllObjectUris(mappingUri, TO_DYMO);
		if (targetUris.length > 0) {
			var targetControls = [];
			for (var j = 0; j < targetUris.length; j++) {
				var targetUri = store.findFirstSubjectUri(NAME, targetUris[j]);
				targetControls.push(controls[targetUri]);
			}
			return createMappingToObjects(mappingUri, dymoMap, dymo, targetControls, controls);
		} else if (dymoUris.length > 0) {
			var dymos = [];
			var constraintFunction = findFunction(dymoUris[0]);
			if (constraintFunction) {
				var allDymos = Object.keys(dymoMap).map(function(key) { return dymoMap[key]; });
				Array.prototype.push.apply(dymos, allDymos.filter(constraintFunction));
			} else {
				for (var j = 0; j < dymoUris.length; j++) {
					dymos.push(dymoMap[dymoUris[j]]);
				}
			}
			return createMappingToObjects(mappingUri, dymoMap, dymo, dymos, controls, constraintFunction);
		} else {
			return createMappingToObjects(mappingUri, dymoMap, dymo, [scheduler], controls);
		}
	}
	
	/** @param {Function=} dymoConstraint (optional) */
	function createMappingToObjects(mappingUri, dymoMap, dymo, targets, controls, dymoConstraint) {
		var isRelative = store.findFirstObjectUri(mappingUri, IS_RELATIVE);
		var domainDims = [];
		var domainDimUris = store.findAllObjectUris(mappingUri, HAS_DOMAIN_DIMENSION);
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = store.findFirstObjectUri(domainDimUris[j], TYPE);
			var currentName = store.findFirstObjectValue(domainDimUris[j], NAME);
			if (!currentName) {
				currentName = domainDimUris[j];
			}
			if (currentType == FEATURE) {
				domainDims.push(currentName);
			} else if (currentType == PARAMETER) {
				var currentParameter;
				if (dymo) {
					currentParameter = addOrUpdateDymoParameter(dymo, currentName, 0);
				} else {
					currentParameter = new Parameter(currentName, 0);
				}
				domainDims.push(currentParameter);
			} else {
				//it's a control
				domainDims.push(controls[domainDimUris[j]]);
			}
		}
		var [args, body] = findArgsAndBody(store.findFirstObjectUri(mappingUri, HAS_FUNCTION));
		var range = store.findFirstObjectUri(mappingUri, TO_PARAMETER);
		//console.log(domainDims, isRelative, {"args":args,"body":body}, targets, range, dymoConstraint)
		return new Mapping(domainDims, isRelative, {"args":args,"body":body}, targets, range, dymoConstraint);
	}
	
	function addOrUpdateDymoParameter(dymo, name, value) {
		var currentParameter = dymo.getParameter(name);
		if (!currentParameter) {
			currentParameter = new Parameter(name, value);
			dymo.addParameter(currentParameter);
		} else {
			currentParameter.update(value);
		}
		return currentParameter;
	}
	
	//currently only works for generically named dymos
	function createGraphFromJson(json, dymoMap) {
		for (var i = 0; i < json.length; i++) {
			if (json[i]) {
				for (var j = 0; j < json[i].length; j++) {
					var dymo = dymoMap[CONTEXT_URI+"dymo"+i];
					var similarDymo = dymoMap[CONTEXT_URI+"dymo"+json[i][j]];
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
		if (store.findFirstObjectUri(id, IS_SMOOTH) && control.setSmooth) {
			control.setSmooth(true);
		}
		var average = Number(store.findFirstObjectUri(id, IS_AVERAGE_OF));
		if (!isNaN(average) && control.setAverageOf) {
			control.setAverageOf(average);
		}
		return control;
	}
	
	function loadFile(path, callback) {
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.onload = function() {
			callback(this.responseText);
		};
		request.error = function(e){
			console.log(e);
		};
		request.send();
	}
	
	function loadFileIntoStore(path, isJsonld, callback) {
		loadFile(path, function(data) {
			store.loadData(data, isJsonld, callback);
		});
	}

}