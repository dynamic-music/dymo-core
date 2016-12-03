/**
 * A graph store for dymos based on EasyStore.
 * @constructor
 * @extends {EasyStore}
 */
function DymoStore(callback) {

	var self = this;

	EasyStore.call(this);

	var dymoOntologyPath = "http://tiny.cc/dymo-ontology"//"../ontologies/dymo-ontology.n3";//"http://tiny.cc/dymo-ontology";
	var mobileOntologyPath = "http://tiny.cc/mobile-audio-ontology"//"../ontologies/mobile-audio-ontology.n3";//"http://tiny.cc/mobile-audio-ontology";
	var dymoContextPath = "http://tiny.cc/dymo-context";
	var dymoSimpleContextPath = "http://tiny.cc/dymo-context-simple";
	var dymoBasePaths = {};

	init();

	//creates the store and loads some basic ontology files
	function init() {
		self.loadFileIntoStore(dymoOntologyPath, false, function() {
			self.loadFileIntoStore(mobileOntologyPath, false, function() {
				if (callback) {
					callback();
				}
			});
		});
	}

	this.addBasePath = function(dymoUri, path) {
		dymoBasePaths[dymoUri] = path;
	}

	this.getBasePath = function(dymoUri) {
		return recursiveFindInParents([dymoUri], function(uri) {
			return dymoBasePaths[uri];
		});
	}

	//depth first search through parents. as soon as the given searchFunction returns something, return it
	function recursiveFindInParents(dymoUris, searchFunction) {
		for (var i = 0; i < dymoUris.length; i++) {
			var currentResult = searchFunction(dymoUris[i]);
			if (currentResult) {
				return currentResult;
			}
		}
		for (var i = 0; i < dymoUris.length; i++) {
			var currentResult = recursiveFindInParents(self.findParents(dymoUris[i]), searchFunction);
			if (currentResult) {
				return currentResult;
			}
		}
	}

	this.getSourcePath = function(dymoUri) {
		var sourcePath = this.findObjectValue(dymoUri, HAS_SOURCE);
		if (sourcePath) {
			var basePath = this.getBasePath(dymoUri);
			return basePath? basePath+sourcePath: sourcePath;
		}
		var parentUris = this.findParents(dymoUri);
		if (parentUris.length > 0) {
			for (var i = 0; i < parentUris.length; i++) {
				var parentSourcePath = this.getSourcePath(parentUris[i]);
				if (parentSourcePath) {
					return parentSourcePath;
				}
			}
		}
	}

	this.addSpecificParameterObserver = function(parameterUri, observer) {
		this.addValueObserver(parameterUri, VALUE, observer);
	}

	this.addParameterObserver = function(dymoUri, parameterType, observer) {
		if (dymoUri && parameterType) {
			//add parameter if there is none so far and get uri
			var parameterUri = this.setParameter(dymoUri, parameterType);
			//add observer
			this.addValueObserver(parameterUri, VALUE, observer);
			return parameterUri;
		}
	}

	this.getParameterObservers = function(dymoUri, parameterType) {
		if (dymoUri && parameterType) {
			var parameterUri = this.findObjectOfType(dymoUri, HAS_PARAMETER, parameterType);
			if (parameterUri) {
				return this.getValueObservers(parameterUri, VALUE);
			}
		}
	}

	this.removeParameterObserver = function(dymoUri, parameterType, observer) {
		if (dymoUri && parameterType) {
			var parameterUri = this.findObjectOfType(dymoUri, HAS_PARAMETER, parameterType);
			if (parameterUri) {
				this.removeValueObserver(parameterUri, VALUE, observer);
			}
		}
	}

	///////// ADDING FUNCTIONS //////////

	this.addDymo = function(dymoUri, parentUri, partUri, sourcePath, type) {
		this.addTriple(dymoUri, TYPE, DYMO);
		if (parentUri) {
			this.addPart(parentUri, dymoUri);
		}
		if (partUri) {
			this.addPart(dymoUri, partUri);
		}
		if (sourcePath) {
			this.addTriple(dymoUri, HAS_SOURCE, N3.Util.createLiteral(sourcePath));
		}
		if (type) {
			this.addTriple(dymoUri, CDT, type);
		}
	}

	this.addPart = function(dymoUri, partUri) {
		self.addObjectToList(dymoUri, HAS_PART, partUri);
	}

	this.setParts = function(dymoUri, partUris) {
		this.deleteList(dymoUri, HAS_PART);
		this.addObjectsToList(dymoUri, HAS_PART, partUris);
	}

	this.replacePartAt = function(dymoUri, partUri, index) {
		if (dymoUri != partUri) {//avoid circular dymos
			return this.replaceObjectInList(dymoUri, HAS_PART, partUri, index);
		}
	}

	this.addSimilar = function(dymoUri, similarUri) {
		this.addTriple(dymoUri, HAS_SIMILAR, similarUri);
	}

	this.addSuccessor = function(dymoUri, successorUri) {
		this.addTriple(dymoUri, HAS_SUCCESSOR, successorUri);
	}

	this.setFeature = function(dymoUri, featureType, value) {
		return this.setObjectValue(dymoUri, HAS_FEATURE, featureType, VALUE, value);
	}

	/**
	 * @param {string|number=} value (optional)
	 * @param {Object=} observer (optional)
	 */
	this.addParameter = function(ownerUri, parameterType, value, observer) {
		this.setParameter(ownerUri, parameterType, value);
		if (observer) {
			this.addParameterObserver(ownerUri, parameterType, observer);
		}
	}

	/**
	 * @param {string|number=} value (optional)
	 */
	this.setParameter = function(ownerUri, parameterType, value) {
		//initialize in case the parameter doesn't exist yet
		if (!this.findParameterUri(ownerUri, parameterType) && (value == null || isNaN(value))) {
			value = this.findObjectValue(parameterType, HAS_STANDARD_VALUE, null);
		}
		//round if integer parameter
		if (this.findObject(parameterType, IS_INTEGER)) {
			value = Math.round(value);
		}
		//set the new value
		return this.setObjectValue(ownerUri, HAS_PARAMETER, parameterType, VALUE, value);
	}

	this.addControl = function(name, type, uri) {
		if (!uri) {
			uri = this.createBlankNode();
		}
		this.addTriple(uri, NAME, N3.Util.createLiteral(name));
		this.addTriple(uri, TYPE, type);
		return uri;
	}

	this.addRendering = function(renderingUri, dymoUri) {
		this.addTriple(renderingUri, TYPE, RENDERING);
		this.addTriple(renderingUri, HAS_DYMO, dymoUri);
	}

	this.addMapping = function(ownerUri, mappingFunction, targetList, targetFunction, rangeUri) {
		var mappingUri = this.createBlankNode();
		this.addTriple(mappingUri, TYPE, MAPPING);
		if (ownerUri) {
			this.addTriple(ownerUri, HAS_MAPPING, mappingUri);
		}
		this.addTriple(mappingUri, HAS_FUNCTION, mappingFunction);
		if (targetList) {
			for (var i = 0; i < targetList.length; i++) {
				this.addTriple(mappingUri, TO_TARGET, targetList[i]);
			}
		} else if (targetFunction) {
			this.addTriple(mappingUri, TO_TARGET, targetFunction);
		}
		this.addTriple(mappingUri, HAS_RANGE, rangeUri);
		if (!this.findObject(rangeUri, TYPE)) {
			this.addTriple(rangeUri, TYPE, CUSTOM_PARAMETER);
		}
		return mappingUri;
	}

	this.addNavigator = function(renderingUri, navigatorType, subsetFunctionArgs, subsetFunctionBody) {
		var navUri = this.createBlankNode();
		this.addTriple(renderingUri, HAS_NAVIGATOR, navUri);
		this.addTriple(navUri, TYPE, navigatorType);
		var funcUri = this.addFunction(subsetFunctionArgs, subsetFunctionBody);
		this.addTriple(navUri, NAV_DYMOS, funcUri);
		return navUri;
	}

	this.addFunction = function(args, body) {
		var funcUri = this.createBlankNode();
		var vars = Object.keys(args);
		for (var i = 0; i < vars.length; i++) {
			var argUri = this.createBlankNode();
			this.addTriple(funcUri, HAS_ARGUMENT, argUri);
			this.addTriple(argUri, HAS_VARIABLE, N3.Util.createLiteral(vars[i]));
			this.addTriple(argUri, HAS_VALUE, args[vars[i]]);
		}
		this.addTriple(funcUri, HAS_BODY, N3.Util.createLiteral(body));
		return funcUri;
	}

	this.updatePartOrder = function(dymoUri, attributeName) {
		var parts = this.findParts(dymoUri);
		if (parts.length > 0) {
			parts.sort(function(p,q) {
				return self.findAttributeValue(p, attributeName) - self.findAttributeValue(q, attributeName);
			});
			this.setParts(dymoUri, parts);
		}
	}


	///////// QUERY FUNCTIONS //////////

	//returns an array with all uris of dymos that do not have parents
	this.findTopDymos = function() {
		var allDymos = this.findAllSubjects(TYPE, DYMO);
		var allParents = this.findAllSubjects(HAS_PART);
		var allParts = [].concat.apply([], allParents.map(function(p){return self.findParts(p);}));
		return allDymos.filter(function(p) { return allParts.indexOf(p) < 0 });
	}

	//returns an array with the uris of all parts of the object with the given uri
	this.findParts = function(dymoUri) {
		return this.findAllObjects(dymoUri, HAS_PART);
	}

	this.findPartAt = function(dymoUri, index) {
		return this.findObjectInListAt(dymoUri, HAS_PART, index);
	}

	//returns an array with the uris of all similars of the object with the given uri
	this.findSimilars = function(dymoUri) {
		//TODO DOESNT WORK WITH LISTS!!!!!
		return this.findAllObjects(dymoUri, HAS_SIMILAR);
	}

	//returns an array with the uris of all successors of the object with the given uri
	this.findSuccessors = function(dymoUri) {
		//TODO DOESNT WORK WITH LISTS!!!!!
		return this.findAllObjects(dymoUri, HAS_SUCCESSOR);
	}

	//TODO currently only works for single hierarchy (implement and test)
	this.findAllParents = function(dymoUri) {
		var parents = [];
		while (dymoUri != null) {
			parents.push(dymoUri);
			dymoUri = DYMO_STORE.findParents(dymoUri)[0];
		}
		return parents;
	}

	this.findParents = function(dymoUri) {
		var containingLists = this.findContainingLists(dymoUri);
		return containingLists[0].filter(function(e,i){return containingLists[1][i] == HAS_PART;});
	}

	//returns an array with the uris of all parts, parts of parts, etc of the object with the given uri
	this.findAllObjectsInHierarchy = function(dymoUri) {
		var allObjects = [dymoUri];
		var parts = this.findParts(dymoUri);
		for (var i = 0; i < parts.length; i++) {
			allObjects = allObjects.concat(this.findAllObjectsInHierarchy(parts[i]));
		}
		return allObjects;
	}

	this.findDymoRelations = function() {
		var domainUris = this.findAllSubjects(DOMAIN, DYMO);
		var rangeUris = this.findAllSubjects(RANGE, DYMO);
		//TODO FIND HAS_PART AUTOMATICALLY..
		return [HAS_PART].concat(intersectArrays(domainUris, rangeUris));
	}

	this.findMappings = function(renderingUri) {
		return this.findAllObjects(renderingUri, HAS_MAPPING);
	}

	this.findNavigators = function(renderingUri) {
		return this.findAllObjects(renderingUri, HAS_NAVIGATOR);
	}

	this.findFunction = function(uri) {
		if (uri) {
			var args = self.findAllObjects(uri, HAS_ARGUMENT);
			var argVars = args.map(function(a){return self.findObjectValue(a, HAS_VARIABLE)});
			var argVals = args.map(function(a){return self.findObject(a, HAS_VALUE)});
			var body = self.findObjectValue(uri, HAS_BODY);
			return [argVars, argVals, body];
		}
	}

	this.findAttributeValue = function(dymoUri, attributeType) {
		var value = this.findParameterValue(dymoUri, attributeType);
		if (value == null) {
			value = this.findFeatureValue(dymoUri, attributeType);
		}
		return value;
	}

	this.findFeatureValue = function(dymoUri, featureType) {
		if (featureType === LEVEL_FEATURE) {
			return this.findLevel(dymoUri);
		} else if (featureType === INDEX_FEATURE) {
			return this.findPartIndex(dymoUri);
		} else {
			return this.findObjectValueOfType(dymoUri, HAS_FEATURE, featureType, VALUE);
		}
	}

	this.findAllFeatureValues = function(dymoUri) {
		return this.findAllObjectValuesOfType(dymoUri, HAS_FEATURE, VALUE)
	}

	this.findAllNumericFeatureValues = function(dymoUri) {
		return this.findAllFeatureValues(dymoUri).filter(function(v){return !isNaN(v);});
	}

	this.findParameterValue = function(dymoUri, parameterType) {
		return this.findObjectValueOfType(dymoUri, HAS_PARAMETER, parameterType, VALUE);
	}

	this.findParameterUri = function(ownerUri, parameterType) {
		if (ownerUri) {
			return this.findObjectOfType(ownerUri, HAS_PARAMETER, parameterType);
		}
		return this.findSubject(null, parameterType);
	}

	//TODO FOR NOW ONLY WORKS WITH SINGLE HIERARCHY..
	this.findPartIndex = function(dymoUri) {
		var firstParentUri = this.findParents(dymoUri)[0];
		return this.findObjectIndexInList(firstParentUri, HAS_PART, dymoUri);
	}

	//TODO FOR NOW ONLY WORKS WITH SINGLE HIERARCHY..
	this.findLevel = function(dymoUri) {
		var level = 0;
		var parent = this.findParents(dymoUri)[0];
		while (parent) {
			level++;
			parent = this.findParents(parent)[0];
		}
		return level;
	}

	//TODO optimize
	this.findMaxLevel = function() {
		var allDymos = this.findAllSubjects(TYPE, DYMO);
		var maxLevel = 0;
		for (var i = 0; i < allDymos.length; i++) {
			maxLevel = Math.max(maxLevel, this.findLevel(allDymos[i]));
		}
		return maxLevel;
	}


	///////// WRITING FUNCTIONS //////////

	this.toJsonld = function(callback) {
		var firstTopDymo = this.findTopDymos()[0];
		this.toRdf(function(result) {
			rdfToJsonld(result, firstTopDymo, callback);
		});
	}

	function triplesToJsonld(triples, frameId, callback) {
		self.triplesToRdf(triples, function(result) {
			rdfToJsonld(result, frameId, callback);
		});
	}

	function rdfToJsonld(rdf, frameId, callback) {
		rdf = rdf.split('_b').join('b'); //rename blank nodes (jsonld.js can't handle the n3.js nomenclature)
		jsonld.fromRDF(rdf, {format: 'application/nquads'}, function(err, doc) {
			jsonld.frame(doc, {"@id":frameId}, function(err, framed) {
				jsonld.compact(framed, DYMO_CONTEXT, function(err, compacted) {
					//deal with imperfections of jsonld.js compaction algorithm to make it reeaally nice
					jsonld.compact(compacted, DYMO_SIMPLE_CONTEXT, function(err, compacted) {
						//make it even nicer by removing blank nodes
						removeBlankNodeIds(compacted);
						//put the right context back
						compacted["@context"] = dymoContextPath;
						//compact local uris
						compacted = JSON.stringify(compacted);
						compacted = compacted.replace(new RegExp(dymoContextPath+'/', 'g'), "");
						callback(compacted);
					});
				});
			});
		});
	}

	//returns a jsonld representation of an object removed from any hierarchy of objects of the same type
	function toFlatJsonld(uri, callback) {
		var type = self.findObject(uri, TYPE, null);
		var triples = self.recursiveFindAllTriples(uri, type);
		triplesToJsonld(triples, uri, function(result) {
			callback(null, JSON.parse(result));
		});
	}

	this.toJsonGraph = function(nodeClass, edgeProperty, callback) {
		var graph = {"nodes":[], "edges":[]};
		var nodeMap = {};
		var nodeUris = this.findAllSubjects(TYPE, nodeClass);
		var edgeTriples = this.find(null, edgeProperty, null);
		async.map(nodeUris, toFlatJsonld, function(err, result){
			graph["nodes"] = result;
			for (var i = 0; i < nodeUris.length; i++) {
				nodeMap[nodeUris[i]] = graph["nodes"][i];
			}
			graph["edges"] = [];
			for (var i = 0; i < edgeTriples.length; i++) {
				if (self.find(edgeTriples[i].object, TYPE, nodeClass).length == 0) {
					if (self.find(edgeTriples[i].object, FIRST).length > 0) {
						//it's a list!!
						var objects = self.findObjectOrList(edgeTriples[i].subject, edgeProperty);
						objects = objects.map(function(t){return createLink(nodeMap[edgeTriples[i].subject], nodeMap[t]);});
						graph["edges"] = graph["edges"].concat(objects);
					}
				} else {
					graph["edges"].push(createLink(nodeMap[edgeTriples[i].subject], nodeMap[edgeTriples[i].object]));
				}
			}
			callback(graph);
		});
	}

	/*this.toJsonMappingGraph = function(callback) {
		var graph = {"nodes":[], "edges":[]};
		var nodeMap = {};
		var nodeUris = [];
		var edges = [];
		var mappingUris = store.findAllObjects(renderingUri, HAS_MAPPING);
		for (var i = 0; i < mappingUris.length; i++) {
			var domainDimUris = store.findAllObjects(mappingUris[i], HAS_DOMAIN_DIMENSION);
			for (var j = 0; j < domainDimUris.length; j++) {
				edges.push(domainDimUris, mappingUris[i])
			}
			var rangeUri = store.findObject(mappingUri, HAS_RANGE);
		}



		for (var i = 0; i < this.findAllSubjects(TYPE, nodeClass);
		var edgeTriples = this.find(null, edgeProperty, null);
		async.map(nodeUris, toFlatJsonld, function(err, result){
			graph["nodes"] = result;
			for (var i = 0; i < nodeUris.length; i++) {
				nodeMap[nodeUris[i]] = graph["nodes"][i];
			}
			graph["edges"] = [];
			for (var i = 0; i < edgeTriples.length; i++) {
				if (self.find(edgeTriples[i].object, TYPE, nodeClass).length == 0) {
					if (self.find(edgeTriples[i].object, FIRST).length > 0) {
						//it's a list!!
						var objects = self.findObjectOrList(edgeTriples[i].subject, edgeProperty);
						objects = objects.map(function(t){return createLink(nodeMap[edgeTriples[i].subject], nodeMap[t]);});
						graph["edges"] = graph["edges"].concat(objects);
					}
				} else {
					graph["edges"].push(createLink(nodeMap[edgeTriples[i].subject], nodeMap[edgeTriples[i].object]));
				}
			}
			callback(graph);
		});
	}*/

	function createLink(source, target) {
		return {"source":source, "target":target, "value":1};
	}

	function removeBlankNodeIds(obj) {
		if (obj && obj instanceof Object) {
			for (var key in obj) {
				if (key == "@id" && obj[key].includes("_:b")) {
					delete obj[key];
				} else {
					removeBlankNodeIds(obj[key]);
				}
			}
		}
	}

}
inheritPrototype(DymoStore, EasyStore);
