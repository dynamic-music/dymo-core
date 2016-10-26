/**
 * A graph store based on N3 that easily manages lists, value replacing and observing,
 * and offers some nice querying functions
 * @constructor
 */
function EasyStore() {

	var self = this;

	var store = N3.Store();

	var observers = {};


	///////// OBSERVING FUNCTIONS //////////

	this.addValueObserver = function(subject, predicate, observer) {
		if (!observers[subject]) {
			observers[subject] = {};
		}
		if (!observers[subject][predicate]) {
			observers[subject][predicate] = [];
		}
		observers[subject][predicate].push(observer);
	}

	this.removeValueObserver = function(subject, predicate, observer) {
		if (observers[subject] && observers[subject][predicate]) {
			var index = observers[subject][predicate].indexOf(observer);
			if (index > -1) {
				observers[subject][predicate].splice(index, 1);
				cleanUpObservers(subject, predicate);
			}
		}
	}

	this.getValueObservers = function(subject, predicate) {
		if (observers[subject] && observers[subject][predicate]) {
			return observers[subject][predicate];
		}
		return [];
	}

	function cleanUpObservers(subject, predicate) {
		if (observers[subject][predicate].length == 0) {
			delete observers[subject][predicate];
			if (Object.keys(observers[subject]).length === 0) {
				delete observers[subject];
			}
		}
	}

	function notifyObservers(subject, predicate, value) {
		if (observers[subject] && observers[subject][predicate]) {
			var observerList = observers[subject][predicate];
			var subjectType = self.findObjectUri(subject, TYPE);
			for (var i in observerList) {
				observerList[i].observedValueChanged(subject, subjectType, value);
			}
		}
	}


	///////// ADDING AND REPLACING FUNCTIONS //////////

	this.addTriple = function(subject, predicate, object) {
		store.addTriple(subject, predicate, object);
	}

	//removes the specified triple from the store. if no object specified, removes the first one found
	/** @param {string=} object (optional) */
	this.removeTriple = function(subject, predicate, object) {
		if (!object) {
			object = this.findObjectUri(subject, predicate);
		}
		return store.removeTriple(subject, predicate, object);
	}

	this.createBlankNode = function() {
		return store.createBlankNode();
	}

	this.setObject = function(subject, predicate, object) {
		this.removeTriple(subject, predicate);
		this.addTriple(subject, predicate, object);
	}

	/**
	 * adds an object of the given type with the given value. replaces the value if such an object already exists.
	 * can be used without valuePredicate/value to simply get the objectUri and/or add a missing object without a value.
	 * can also be used without subject and predicate, in which case an independent global object is added or changed
	 * @param {string=} valuePredicate (optional)
	 * @param {string=} value (optional) */
	this.setObjectValue = function(subject, predicate, objectType, valuePredicate, value) {
		var objectUri;
		if (subject && predicate) {
			objectUri = this.findObjectUriOfType(subject, predicate, objectType);
		} else if (!subject) {
			objectUri = this.findSubjectUri(TYPE, objectType);
		}
		if (!objectUri) {
			objectUri = this.createBlankNode();
			if (subject && predicate) {
				this.addTriple(subject, predicate, objectUri);
			}
			this.addTriple(objectUri, TYPE, objectType);
		}
		this.setValue(objectUri, valuePredicate, value);
		return objectUri;
	}

	//replaces the value of the given subject and predicate, value can be a list
	this.setValue = function(subject, valuePredicate, value) {
		if (valuePredicate && value != null && !Number.isNaN(value)) {//NaN test..
			this.removeTriple(subject, valuePredicate);
			if (Array.isArray(value)) {
				for (var i = 0; i < value.length; i++) {
					this.addObjectToList(subject, valuePredicate, N3.Util.createLiteral(value[i]));
				}
			} else {
				this.addTriple(subject, valuePredicate, N3.Util.createLiteral(value));
			}
			notifyObservers(subject, valuePredicate, value);
		}
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	this.addObjectToList = function(subject, predicate, object) {
		var listUri = this.findObjectUri(subject, predicate);
		var newElement = this.createBlankNode();
		if (!listUri) {
			this.addTriple(subject, predicate, newElement);
		} else {
			var lastElement = getLastElement(listUri);
			this.removeTriple(lastElement, REST, NIL);
			this.addTriple(lastElement, REST, newElement);
		}
		this.addTriple(newElement, FIRST, object);
		this.addTriple(newElement, REST, NIL);
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	//returns the object that was there before
	this.replaceObjectInList = function(subject, predicate, object, index) {
		var listUri = this.findObjectUri(subject, predicate);
		var elementAtIndex = getElementAt(listUri, index);
		var previousObject = this.findObjectUri(elementAtIndex, FIRST);
		this.removeTriple(elementAtIndex, FIRST);
		this.addTriple(elementAtIndex, FIRST, object);
		return previousObject;
	}

	this.removeObjectFromList = function(subject, predicate, index) {
		var listUri = this.findObjectUri(subject, predicate);
		var newElement = this.createBlankNode();
		var elementBeforeIndex = getElementAt(listUri, index-1);
		var elementAtIndex = self.findObjectUri(elementBeforeIndex, REST);
		var elementAfterIndex = self.findObjectUri(elementAtIndex, REST);
		this.removeTriple(elementBeforeIndex, REST);
		this.addTriple(elementBeforeIndex, REST, elementAfterIndex);
		this.removeTriple(elementAtIndex, FIRST);
		//TODO REMOVE BLANK NODE
	}


	///////// QUERYING FUNCTIONS //////////

	//calls regular store.find function
	this.find = function(subject, predicate, object) {
		return store.find(subject, predicate, object);
	}

	//returns the uri of the object of the first result found in the store
	this.findObjectUri = function(subject, predicate) {
		var results = store.find(subject, predicate);
		if (results.length > 0) {
			return results[0].object;
		}
	}

	this.findObjectUriOfType = function(subject, predicate, type) {
		var objects = store.find(subject, predicate).map(function(t){return t.object;});
		objects = objects.filter(function(o){return store.find(o, TYPE, type).length > 0;});
		if (objects.length > 0) {
			return objects[0];
		}
	}

	//returns the uri of the subject of the first result found in the store
	this.findSubjectUri = function(predicate, object) {
		var results = store.find(null, predicate, object);
		if (results.length > 0) {
			return results[0].subject;
		}
	}

	//returns the value of the first result found in the store
	this.findObjectValue = function(subject, predicate) {
		var object = this.findObjectUri(subject, predicate);
		if (object) {
			return getLiteralValue(object);
		}
	}

	this.findObjectValuesOfType = function(subject, predicate, objectType, valuePredicate) {
		var objectUri = this.findObjectUriOfType(subject, predicate, objectType);
		return findValues(objectUri, valuePredicate);
	}

	this.getFirstValueOfType = function(objectType, valuePredicate) {
		var objectUri = this.findSubjectUri(TYPE, objectType);
		return findValues(objectUri, valuePredicate);
	}

	function findValues(uri, valuePredicate) {
		if (uri) {
			var objectValues = self.findAllObjectValues(uri, valuePredicate);
			if (objectValues.length > 0) {
				if (objectValues.length == 1) {
					objectValues = objectValues[0];
				}
				return objectValues;
			}
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
		return this.findAllObjectUris(subject, predicate).map(getLiteralValue);
	}

	this.findAllObjectValuesOfType = function(subject, predicate, valuePredicate) {
		var objectValues = [];
		var objectUris = this.findAllObjectUris(subject, predicate);
		for (var i = 0; i < objectUris.length; i++) {
			objectValues.push(this.findObjectValue(objectUris[i], valuePredicate));
		}
		return objectValues;
	}

	this.findObjectListUris = function(subject, predicate) {
		if (subject && predicate) {
			var currentElement = this.findObjectUri(subject, predicate);
			return getListElementUrisIfList(currentElement);
		}
	}

	this.findObjectIndexInList = function(subject, predicate, object) {
		if (subject && predicate) {
			return getIndexInList(this.findObjectUri(subject, predicate), object);
		}
	}

	this.findObjectInListAtIndex = function(subject, predicate, index) {
		if (subject && predicate) {
			var element = getElementAt(this.findObjectUri(subject, predicate), index);
			if (element) {
				return self.findObjectUri(element, FIRST);
			}
		}
	}

	this.findContainingLists = function(object) {
		var subjectUris = [];
		var predicateUris = [];
		var listElements = this.findAllSubjectUris(FIRST, object);
		for (var i = 0; i < listElements.length; i++) {
			var currentElement = listElements[i];
			var currentPredecessor = this.findSubjectUri(REST, currentElement);
			while (currentPredecessor) {
				currentElement = currentPredecessor;
				currentPredecessor = this.findSubjectUri(REST, currentElement);
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

	this.findAllSubClasses = function(superclassUri) {
		return this.findAllSubjectUris(RDFS_URI+"subClassOf", superclassUri);
	}

	this.isSubclassOf = function(class1, class2) {
		var superClass = this.findObjectUri(class1, RDFS_URI+"subClassOf");
		while (superClass) {
			if (superClass == class2) {
				return true;
			}
			superClass = this.findObjectUri(superClass, RDFS_URI+"subClassOf");
		}
		return false;
	}

	this.isSubtypeOf = function(type1, type2) {
		var superType = this.findObjectUri(type1, TYPE);
		while (superType) {
			if (superType == type2) {
				return true;
			}
			superType = this.findObjectUri(superType, TYPE);
		}
		return false;
	}

	//returns all elements of a list if the given uri is a list, undefined otherwise
	function getListElementUrisIfList(listUri) {
		var first = self.findObjectUri(listUri, FIRST);
		if (first) {
			var objectUris = [];
			objectUris.push(first);
			var currentRest = self.findObjectUri(listUri, REST);
			while (currentRest != NIL) {
				objectUris.push(self.findObjectUri(currentRest, FIRST));
				currentRest = self.findObjectUri(currentRest, REST);
			}
			return objectUris;
		}
	}

	//returns the index of the given element in the given list, -1 if not found
	function getIndexInList(listUri, elementUri) {
		var index = 0;
		var currentRest = listUri;
		while (currentRest != NIL) {
			if (self.findObjectUri(currentRest, FIRST) == elementUri) {
				return index;
			}
			currentRest = self.findObjectUri(currentRest, REST);
			index++;
		}
		return -1;
	}

	function getLastElement(listUri) {
		return getElementAt(listUri);
	}

	/**
	 * returns the uri of the element at the given index in the given list, undefined if not found
	 * returns uri of last element if no index given
	 * @param {number=} index (optional)
	 */
	function getElementAt(listUri, index) {
		if (listUri) {
			var currentIndex = 0;
			var currentRest = listUri;
			var nextRest = self.findObjectUri(currentRest, REST);
			while (nextRest != NIL && (index == null || currentIndex < index)) {
				currentRest = nextRest;
				nextRest = self.findObjectUri(currentRest, REST);
				currentIndex++;
			}
			if (index == null || currentIndex == index) {
				return currentRest;
			}
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


	///////// LOADING FUNCTIONS //////////

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
