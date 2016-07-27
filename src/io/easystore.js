/**
 * A graph store based on N3 that offers some nice querying functions.
 * @constructor
 */
function EasyStore() {
	
	var store = N3.Store();
	
	this.loadData = function(data, isJsonld, callback) {
		jsonldToNquads(data, isJsonld, function(nquads) {
			N3.Parser().parse(nquads, function (error, triple, prefixes) {
				//keep streaming triples
				if (triple) {
					store.addTriple(triple);
				//done
				} else if (callback) {
					callback();
				}
			});
		});
	}
	
	this.logData = function() {
		var rows = store.find(null).map(function(t){return t.subject +"\n" + t.predicate + "\n" + t.object});
		for (var i in rows) {
			console.log(rows[i]);
		}
	}
	
	this.writeJsonld = function(callback) {
		var prefixes = {
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
			"owl": "http://www.w3.org/2002/07/owl#",
			"sch": "http://schema.org/",
			"mo": "http://purl.org/ontology/mo/",
			"mt": "http://purl.org/ontology/studio/multitrack#",
			"ch": "http://tiny.cc/charm-ontology#",
			"dy": "http://tiny.cc/dymo-ontology#",
			"mb": "http://tiny.cc/mobile-audio-ontology#",
		};
		var allTriples = store.find(null, null, null);
		var writer = N3.Writer({ format: 'application/nquads' });
		for (var i = 0; i < allTriples.length; i++) {
			writer.addTriple(allTriples[i]);
		}
		writer.end(function (error, result) {
			result = result.split('_b').join('b'); //rename blank nodes (jsonld.js can't handle the n3.js nomenclature)
			jsonld.fromRDF(result, {format: 'application/nquads'}, function(err, doc) {
				jsonld.frame(doc, {"@id":"http://tiny.cc/dymo-context/dymo0"}, function(err, framed) {
					jsonld.compact(framed, "http://tiny.cc/dymo-context", function(err, compacted) {
						removeBlankNodeIds(compacted);
						callback(JSON.stringify(compacted, null, 2));
					});
				});
			});
		});
	}
	
	function jsonldToNquads(data, isJsonld, callback) {
		if (isJsonld) {
			jsonld.toRDF(data, {format: 'application/nquads'}, function(err, nquads) {
				callback(nquads);
			});
		} else {
			callback(data);
		}
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
	
	//calls regular store.find function
	this.find = function(subject, predicate, object) {
		return store.find(subject, predicate, object);
	}
	
	//returns the uri of the object of the first result found in the store
	this.findFirstObjectUri = function(subject, predicate) {
		var results = store.find(subject, predicate, null);
		if (results.length > 0) {
			return results[0].object;
		}
	}
	
	//returns the uri of the subject of the first result found in the store
	this.findFirstSubjectUri = function(predicate, object) {
		var results = store.find(null, predicate, object);
		if (results.length > 0) {
			return results[0].subject;
		}
	}
	
	//returns the value of the first result found in the store
	this.findFirstObjectValue = function(subject, predicate) {
		var object = this.findFirstObjectUri(subject, predicate);
		if (object) {
			var value = N3.Util.getLiteralValue(object);
			if (N3.Util.getLiteralType(object) != "http://www.w3.org/2001/XMLSchema#string") {
				value = Number(value);
			}
			return value;
		}
	}
	
	//returns the objects of all results found in the store
	this.findAllObjectUris = function(subject, predicate) {
		return store.find(subject, predicate, null).map(function(t){return t.object;});
	}
	
	//returns the objects of all results found in the store
	this.findAllObjectValues = function(subject, predicate) {
		return this.findAllObjectUris(subject, predicate).map(function(a){return N3.Util.getLiteralValue(a);});
	}
	
	this.isSubclassOf = function(class1, class2) {
		var superClass = this.findFirstObjectUri(class1, RDFS_URI+"subClassOf");
		while (superClass) {
			//console.log(superClass, class2)
			if (superClass == class2) {
				return true;
			}
			superClass = this.findFirstObjectUri(superClass, RDFS_URI+"subClassOf");
		}
		return false;
	}

}