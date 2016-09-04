/**
 * A graph store for dymos based on EasyStore.
 * @constructor
 * @extends {EasyStore}
 */
function DymoStore() {
	
	var self = this;
	
	EasyStore.call(this);
	
	///////// ADDING FUNCTIONS //////////
	
	this.addDymo = function(dymoUri, parentUri, partUri, sourcePath) {
		this.addTriple(dymoUri, TYPE, DYMO);
		if (parentUri) {
			this.addTriple(parentUri, HAS_PART, dymoUri);
		}
		if (partUri) {
			this.addTriple(dymoUri, HAS_PART, partUri);
		}
		if (sourcePath) {
			this.addTriple(dymoUri, HAS_SOURCE, sourcePath);
		}
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
		this.addTriple(featureUri, VALUE, N3.Util.createLiteral(value));
	}
	
	
	///////// QUERY FUNCTIONS //////////
	
	//returns an array with all uris of dymos that do not have parents
	this.findTopDymos = function() {
		var allPartTriples = this.find(null, HAS_PART, null);
		var allParents = Array.from(new Set(allPartTriples.map(function(t){return t.subject;})), function(x){return x;});
		var allParts = Array.from(new Set(allPartTriples.map(function(t){return t.object;})), function(x){return x;});
		return allParents.filter(function(p) { return allParts.indexOf(p) < 0 });
	}
	
	//returns an array with the uris of all parts of the object with the given uri
	this.findParts = function(dymoUri) {
		return this.findAllObjectUris(dymoUri, HAS_PART);
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
		return this.findFirstObjectValue(featureUri, VALUE);
	}
	
	this.getLevel = function(dymoUri) {
		var level = 0;
		var parent = this.findFirstSubjectUri(HAS_PART, dymoUri);
		while (parent) {
			level++;
			parent = this.findFirstSubjectUri(HAS_PART, dymoUri);
		}
		return level;
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
		var nodeUris = this.find(null, TYPE, nodeClass).map(function(t) {return t.subject;});
		var linkTriples = this.find(null, linkProperty, null);
		async.map(nodeUris, toFlatJsonld, function(err, result){
			graph["nodes"] = result;
			for (var i = 0; i < nodeUris.length; i++) {
				nodeMap[nodeUris[i]] = graph["nodes"][i];
			}
			graph["links"] = linkTriples.map(function(t){return createLink(nodeMap[t.subject], nodeMap[t.object]);});
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