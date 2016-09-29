/**
 * A graph store based on N3 that offers some nice querying functions.
 * @constructor
 */
function EasyStore() {
	
	var self = this;
	
	var store = N3.Store();
	
	this.addTriple = function(subject, predicate, object) {
		return store.addTriple(subject, predicate, object);
	}
	
	//removes the specified triple from the store. if no object specified, removes the first one found
	this.removeTriple = function(subject, predicate, object) {
		if (!object) {
			object = this.findFirstObjectUri(subject, predicate);
		}
		return store.removeTriple(subject, predicate, object);
	}
	
	this.createBlankNode = function() {
		return store.createBlankNode();
	}
	
	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	this.addObjectToList = function(subject, predicate, object) {
		var list = this.findFirstObjectUri(subject, predicate);
		var newElement = this.createBlankNode();
		if (!list) {
			this.addTriple(subject, predicate, newElement);
		} else {
			var lastElement = list;
			var lastElementRest = this.findFirstObjectUri(lastElement, REST);
			while (lastElementRest != NIL) {
				lastElement = lastElementRest;
				lastElementRest = this.findFirstObjectUri(lastElement, REST);
			}
			this.removeTriple(lastElement, REST, NIL);
			this.addTriple(lastElement, REST, newElement);
		}
		this.addTriple(newElement, FIRST, object);
		this.addTriple(newElement, REST, NIL);
	}
	
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
	
	this.loadFileIntoStore = function(path, isJsonld, callback) {
		loadFile(path, function(data) {
			self.loadData(data, isJsonld, callback);
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
	
	
	///////// QUERY FUNCTIONS //////////
	
	//calls regular store.find function
	this.find = function(subject, predicate, object) {
		return store.find(subject, predicate, object);
	}
	
	//returns the uri of the object of the first result found in the store
	this.findFirstObjectUri = function(subject, predicate) {
		var results = store.find(subject, predicate);
		if (results.length > 0) {
			return results[0].object;
		}
	}
	
	this.findFirstObjectUriOfType = function(subject, predicate, type) {
		var objects = store.find(subject, predicate).map(function(t){return t.object;});
		objects = objects.filter(function(o){return store.find(o, TYPE, type).length > 0;});
		if (objects.length > 0) {
			return objects[0];
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
			return getLiteralValue(object);
		}
	}
	
	//returns the subjects of all results found in the store
	this.findAllSubjectUris = function(predicate, object) {
		return store.find(null, predicate, object).map(function(t){return t.subject;});
	}
	
	//returns the object uris of all results found in the store, including the list elements if they are lists
	this.findAllObjectUris = function(subject, predicate) {
		var allObjects = store.find(subject, predicate, null).map(function(t){return t.object;});
		for (var i = 0; i < allObjects.length; i++) {
			var listElements = getListElementUrisIfList(allObjects[i]);
			if (listElements) {
				allObjects[i] = listElements;
			}
		}
		return flattenArray(allObjects);
	}
	
	//returns the object values of all results found in the store, including the list elements if they are lists
	this.findAllObjectValues = function(subject, predicate) {
		return this.findAllObjectUris(subject, predicate).map(function(a){return N3.Util.getLiteralValue(a);});
	}
	
	this.findObjectListUris = function(subject, predicate) {
		var currentElement = this.findFirstObjectUri(subject, predicate);
		return getListElementUrisIfList(currentElement);
	}
	
	this.findContainingLists = function(object) {
		var subjectUris = [];
		var predicateUris = [];
		var listElements = this.findAllSubjectUris(FIRST, object);
		for (var i = 0; i < listElements.length; i++) {
			var currentElement = listElements[i];
			var currentPredecessor = this.findFirstSubjectUri(REST, currentElement);
			while (currentPredecessor) {
				currentElement = currentPredecessor;
				currentPredecessor = this.findFirstSubjectUri(REST, currentElement);
			}
			var listOrigin = this.find(null, null, currentElement)[0];
			subjectUris[i] = listOrigin.subject;
			predicateUris[i] = listOrigin.predicate;
		}
		return [subjectUris, predicateUris];
	}
	
	//return all triples about the given uri and the respective 
	this.recursiveFindAllTriplesExcept = function(uri, type) {
		//find all triples for given uri
		var triples = store.find(uri, null, null);
		var subTriples = [];
		for (var i = triples.length-1; i >= 0; i--) {
			//remove all triples whose object is of the given type
			if (store.find(triples[i].object, TYPE, type).length > 0) {
				triples.splice(i, 1);
			} else {
				subTriples = subTriples.concat(this.recursiveFindAllTriplesExcept(triples[i].object, type));
			}
		}
		return triples.concat(subTriples);
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
	
	//returns all elements of a list if the given uri is a list, undefined otherwise
	function getListElementUrisIfList(listUri) {
		var first = self.findFirstObjectUri(listUri, FIRST);
		if (first) {
			var objectUris = [];
			objectUris.push(first);
			var currentRest = self.findFirstObjectUri(listUri, REST);
			while (currentRest != NIL) {
				objectUris.push(self.findFirstObjectUri(currentRest, FIRST));
				currentRest = self.findFirstObjectUri(currentRest, REST);
			}
			return objectUris;
		}
	}
	
	function getLiteralValue(uri) {
		var value = N3.Util.getLiteralValue(uri);
		var type = N3.Util.getLiteralType(uri);
		if (type != "http://www.w3.org/2001/XMLSchema#string") {
			value = Number(value);
		}
		return value;
	}
	
	
	///////// WRITING FUNCTIONS //////////
	
	this.toRdf = function(callback) {
		var allTriples = store.find(null, null, null);
		this.triplesToRdf(allTriples, callback);
	}
	
	this.triplesToRdf = function(triples, callback) {
		var writer = N3.Writer({ format: 'application/nquads' });
		for (var i = 0; i < triples.length; i++) {
			writer.addTriple(triples[i]);
		}
		writer.end(function(err, rdf) {
			callback(rdf);
		});
	}
	
	this.logData = function() {
		var rows = store.find(null).map(function(t){return t.subject +"\n" + t.predicate + "\n" + t.object});
		for (var i in rows) {
			console.log(rows[i]);
		}
	}

}