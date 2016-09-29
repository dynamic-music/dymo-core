/**
 * A graph store for dymos based on EasyStore.
 * @constructor
 * @extends {EasyStore}
 */
function DymoStore(callback) {
	
	var self = this;
	
	EasyStore.call(this);
	
	init();
	
	//creates the store and loads some basic ontology files
	function init() {
		self.loadFileIntoStore("http://tiny.cc/dymo-ontology", false, function() {
			self.loadFileIntoStore("http://tiny.cc/mobile-audio-ontology", false, function() {
				if (callback) {
					callback();
				}
			});
		});
	}
	
	///////// ADDING FUNCTIONS //////////
	
	this.addDymo = function(dymoUri, parentUri, partUri, sourcePath) {
		this.addTriple(dymoUri, TYPE, DYMO);
		if (parentUri) {
			addPart(parentUri, dymoUri);
		}
		if (partUri) {
			addPart(dymoUri, partUri);
		}
		if (sourcePath) {
			this.addTriple(dymoUri, HAS_SOURCE, N3.Util.createLiteral(sourcePath));
		}
	}
	
	function addPart(dymoUri, partUri) {
		self.addObjectToList(dymoUri, HAS_PART, partUri);
	}
	
	this.addSimilar = function(dymoUri, similarUri) {
		this.addTriple(dymoUri, HAS_SIMILAR, similarUri);
	}
	
	this.setFeature = function(dymoUri, featureType, value) {
		var featureUri = this.findFirstObjectUriOfType(dymoUri, HAS_FEATURE, featureType);
		if (!featureUri) {
			featureUri = this.createBlankNode();
			this.addTriple(dymoUri, HAS_FEATURE, featureUri);
			this.addTriple(featureUri, TYPE, featureType);
		} else {
			this.removeTriple(featureUri, VALUE);
		}
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				this.addObjectToList(featureUri, VALUE, N3.Util.createLiteral(value[i]));
			}
		} else {
			this.addTriple(featureUri, VALUE, N3.Util.createLiteral(value));
		}
	}
	
	
	///////// QUERY FUNCTIONS //////////
	
	//returns an array with all uris of dymos that do not have parents
	this.findTopDymos = function() {
		var allDymos = this.findAllSubjectUris(TYPE, DYMO);
		var allParents = this.findAllSubjectUris(HAS_PART);
		var allParts = [].concat.apply([], allParents.map(function(p){return self.findParts(p);}));
		return allDymos.filter(function(p) { return allParts.indexOf(p) < 0 });
	}
	
	//returns an array with the uris of all parts of the object with the given uri
	this.findParts = function(dymoUri) {
		return this.findAllObjectUris(dymoUri, HAS_PART);
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
	
	this.findFunction = function(uri) {
		var [args, body] = this.findArgsAndBody(uri);
		if (args && body) {
			return Function.apply(null, args.concat(body));
		}
	}
	
	this.findArgsAndBody = function(uri) {
		var args = this.findAllObjectValues(uri, HAS_ARGUMENT);
		var body = this.findFirstObjectValue(uri, HAS_BODY);
		return [args, body];
	}
	
	this.findFeature = function(dymoUri, featureType) {
		var featureUri = this.findFirstObjectUriOfType(dymoUri, HAS_FEATURE, featureType);
		if (featureUri) {
			var featureValue = this.findAllObjectValues(featureUri, VALUE);
			if (featureValue.length == 1) {
				featureValue = featureValue[0];
			}
			return featureValue;
		}
	}
	
	this.findAllFeatureValues = function(dymoUri) {
		var featureValues = [];
		var featureUris = this.findAllObjectUris(dymoUri, HAS_FEATURE);
		for (var i = 0; i < featureUris.length; i++) {
			featureValues.push(this.findFeatureValue(featureUris[i]));
		}
		return featureValues;
	}
	
	this.findFeatureValue = function(featureUri) {
		return this.findAllObjectValues(featureUri, VALUE);
	}
	
	//TODO FOR NOW ONLY WORKS WITH SINGLE HIERARCHY..
	this.getLevel = function(dymoUri) {
		var level = 0;
		var parent = this.findParents(dymoUri)[0];
		while (parent) {
			level++;
			parent = this.findParents(parent)[0];
		}
		return level;
	}
	
	//TODO optimize
	this.getMaxLevel = function() {
		var allDymos = this.findAllSubjectUris(TYPE, DYMO);
		var maxLevel = 0;
		for (var i = 0; i < allDymos.length; i++) {
			maxLevel = Math.max(maxLevel, this.getLevel(allDymos[i]));
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
				jsonld.compact(framed, "http://tiny.cc/dymo-context", function(err, compacted) {
					//deal with imperfections of jsonld.js compaction algorithm to make it reeaally nice
					jsonld.compact(compacted, "http://tiny.cc/dymo-context-simple", function(err, compacted) {
						//make it even nicer by removing blank nodes
						removeBlankNodeIds(compacted);
						compacted = JSON.stringify(compacted, null, 2);
						//compact local uris
						compacted = compacted.replace(new RegExp('http://tiny.cc/dymo-context/', 'g'), "");
						//put the right context back
						compacted = compacted.replace("http://tiny.cc/dymo-context-simple", "http://tiny.cc/dymo-context");
						callback(compacted);
					});
				});
			});
		});
	}
	
	//returns a jsonld representation of an object removed from any hierarchy of objects of the same type
	function toFlatJsonld(uri, callback) {
		var type = self.findFirstObjectUri(uri, TYPE, null);
		var triples = self.recursiveFindAllTriplesExcept(uri, type);
		triplesToJsonld(triples, uri, function(result) {
			callback(null, JSON.parse(result));
		});
	}
	
	this.toJsonGraph = function(nodeClass, linkProperty, callback) {
		var graph = {"nodes":[], "links":[]};
		var nodeMap = {};
		var nodeUris = this.findAllSubjectUris(TYPE, nodeClass);
		var linkTriples = this.find(null, linkProperty, null);
		async.map(nodeUris, toFlatJsonld, function(err, result){
			graph["nodes"] = result;
			for (var i = 0; i < nodeUris.length; i++) {
				nodeMap[nodeUris[i]] = graph["nodes"][i];
			}
			graph["links"] = [];
			for (var i = 0; i < linkTriples.length; i++) {
				if (self.find(linkTriples[i].object, TYPE, nodeClass).length == 0) {
					if (self.find(linkTriples[i].object, FIRST).length > 0) {
						//it's a list!!
						var objects = self.findObjectListUris(linkTriples[i].subject, linkProperty);
						objects = objects.map(function(t){return createLink(nodeMap[linkTriples[i].subject], nodeMap[t]);});
						graph["links"] = graph["links"].concat(objects);
					}
				} else {
					graph["links"].push(createLink(nodeMap[linkTriples[i].subject], nodeMap[linkTriples[i].object]));
				}
			}
			callback(graph);
		});
	}
	
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