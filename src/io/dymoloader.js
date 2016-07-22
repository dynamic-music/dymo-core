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
		var allPartTriples = store.find(null, CHARM_URI+"hasPart", null);
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
		var args = store.findAllObjectValues(uri, MOBILE_URI+"hasArgument");
		var body = store.findFirstObjectValue(uri, MOBILE_URI+"hasBody");
		return [args, body];
	}
	
	function recursiveCreateDymoAndParts(currentDymoUri, dymoMap) {
		var cdt = store.findFirstObjectUri(currentDymoUri, CHARM_URI+"cdt");
		var dymo = new DynamicMusicObject(currentDymoUri, cdt, scheduler);
		dymo.setBasePath(dymoBasePath);
		dymoMap[currentDymoUri] = dymo;
		dymo.setSourcePath(store.findFirstObjectValue(currentDymoUri, DYMO_URI+"hasSource"));
		var features = store.findAllObjectUris(currentDymoUri, DYMO_URI+"hasFeature");
		for (var i = 0; i < features.length; i++) {
			dymo.setFeature(features[i], store.findFirstObjectUri(features[i], CHARM_URI+"value"));
		}
		var parameters = store.findAllObjectUris(currentDymoUri, DYMO_URI+"hasParameter");
		for (var i = 0; i < parameters.length; i++) {
			addOrUpdateDymoParameter(dymo, store.findFirstObjectUri(parameters[i], RDF_URI+"type"), store.findFirstObjectValue(parameters[i], CHARM_URI+"value"));
		}
		var parts = store.findAllObjectUris(currentDymoUri, CHARM_URI+"hasPart");
		for (var i = 0; i < parts.length; i++) {
			dymo.addPart(recursiveCreateDymoAndParts(parts[i], dymoMap));
		}
		return dymo;
	}
	
	function recursiveAddMappingsAndSimilars(currentDymoUri, dymoMap) {
		var dymo = dymoMap[currentDymoUri];
		//first add similars
		var similars = store.findAllObjectUris(currentDymoUri, DYMO_URI+"hasSimilar");
		for (var i = 0; i < similars.length; i++) {
			dymo.addSimilar(dymoMap[similars[i]]);
		}
		//then add mappings
		var mappings = store.findAllObjectUris(currentDymoUri, MOBILE_URI+"hasMapping");
		for (var i = 0; i < mappings.length; i++) {
			dymo.addMapping(createMapping(mappings[i], dymoMap, dymo));
		}
		//iterate through parts
		var parts = store.findAllObjectUris(currentDymoUri, CHARM_URI+"hasPart");
		for (var i = 0; i < parts.length; i++) {
			recursiveAddMappingsAndSimilars(parts[i], dymoMap);
		}
	}
	
	function createRendering(dymoMap) {
		var renderingUri = store.findFirstSubjectUri(RDF_URI+"type", MOBILE_URI+"Rendering");
		var rendering = new Rendering(dymoMap[store.findFirstObjectUri(renderingUri, MOBILE_URI+"hasDymo")]);
		var mappingUris = store.findAllObjectUris(renderingUri, MOBILE_URI+"hasMapping");
		var controls = createControls(mappingUris);
		
		for (var i = 0; i < mappingUris.length; i++) {
			rendering.addMapping(createMapping(mappingUris[i], dymoMap, undefined, controls));
		}
		var navigator = store.findFirstObjectUri(renderingUri, DYMO_URI+"hasNavigator");
		if (navigator) {
			var dymosFunction = store.findFirstObjectUri(navigator, MOBILE_URI+"toDymo");
			dymosFunction = findFunction(dymosFunction);
			rendering.addNavigator(getNavigator(store.findFirstObjectUri(navigator, RDF_URI+"type")), dymosFunction);
		}
		return [rendering, controls];
	}
	
	function createControls(mappingUris) {
		var controls = {};
		for (var i = 0; i < mappingUris.length; i++) {
			var domainDimUris = store.findAllObjectUris(mappingUris[i], MOBILE_URI+"hasDomainDimension");
			for (var j = 0; j < domainDimUris.length; j++) {
				var currentType = store.findFirstObjectUri(domainDimUris[j], RDF_URI+"type");
				var currentName = store.findFirstObjectValue(domainDimUris[j], SCHEMA_URI+"name");
				if (!currentName) {
					currentName = domainDimUris[j];
				}
				if (store.isSubclassOf(currentType, MOBILE_URI+"MobileControl")) {
					if (!controls[domainDimUris[j]]) {
						var control = getControl(domainDimUris[j], currentName, currentType);
						var value = Number(store.findFirstObjectUri(domainDimUris[j], CHARM_URI+"value"));
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
		var targetUris = store.findAllObjectUris(mappingUri, MOBILE_URI+"toTarget");
		var dymoUris = store.findAllObjectUris(mappingUri, MOBILE_URI+"toDymo");
		if (targetUris.length > 0) {
			var targetControls = [];
			for (var j = 0; j < targetUris.length; j++) {
				var targetUri = store.findFirstSubjectUri(SCHEMA_URI+"name", targetUris[j]);
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
		var isRelative = store.findFirstObjectUri(mappingUri, MOBILE_URI+"isRelative");
		var domainDims = [];
		var domainDimUris = store.findAllObjectUris(mappingUri, MOBILE_URI+"hasDomainDimension");
		for (var j = 0; j < domainDimUris.length; j++) {
			var currentType = store.findFirstObjectUri(domainDimUris[j], RDF_URI+"type");
			var currentName = store.findFirstObjectValue(domainDimUris[j], SCHEMA_URI+"name");
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
		var [args, body] = findArgsAndBody(store.findFirstObjectUri(mappingUri, MOBILE_URI+"hasFunction"));
		var range = store.findFirstObjectUri(mappingUri, MOBILE_URI+"toParameter");
		//console.log(domainDims, targets, range)
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
			//TODO FIX!!!!!!
			/*var uuid = options["uuid"];
			var major = parseInt(options["major"], 10);
			var minor = parseInt(options["minor"], 10);*/
			var uuid, major, minor;
			control = new BeaconControl(uuid, major, minor);
		}	else if (type == SLIDER || type == TOGGLE || type == BUTTON || type == CUSTOM) {
			control = new Control(name, type);
		} else if (type == RANDOM) {
			control = new RandomControl();
		} else if (type == BROWNIAN) {
			//TODO FIX!!
			control = new BrownianControl(0);//parseFloat(options["value"]));
		} else if (type == RAMP) {
			//store.findFirstObjectUri(domainDimUris[j], RDF_URI+"duration");
			//var milisDuration = Math.round(parseFloat(options["duration"])*1000);
			//TODO FIX DURATION!!!!!!
			var value = store.findFirstObjectValue(id, CHARM_URI+"value"); //TODO SHOULDNT BE CHARM
			control = new RampControl(3000, value);
		}
		//TODO implement in better way (only works for sensor controls)
		if (store.findFirstObjectUri(id, MOBILE_URI+"isSmooth") && control.setSmooth) {
			control.setSmooth(true);
		}
		var average = Number(store.findFirstObjectUri(id, MOBILE_URI+"isAverageOf"));
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