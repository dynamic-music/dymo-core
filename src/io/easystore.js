/**
 * A graph store based on N3 that easily manages lists, value replacing and observing,
 * and offers some nice querying functions
 * @constructor
 */
function EasyStore() {

	var self = this;

	var store = N3.Store();

	var valueObservers = {};
	var typeObservers = {};


	///////// OBSERVING FUNCTIONS //////////

	this.addValueObserver = function(subject, predicate, observer) {
		if (!valueObservers[subject]) {
			valueObservers[subject] = {};
		}
		if (!valueObservers[subject][predicate]) {
			valueObservers[subject][predicate] = [];
		}
		valueObservers[subject][predicate].push(observer);
		//notifyObservers(subject, predicate, this.findObjectValue(subject, predicate));
	}

	this.addTypeObserver = function(type, predicate, observer) {
		if (!typeObservers[type]) {
			typeObservers[type] = [];
		}
		typeObservers[type].push(observer);
	}

	this.removeValueObserver = function(subject, predicate, observer) {
		if (valueObservers[subject] && valueObservers[subject][predicate]) {
			var index = valueObservers[subject][predicate].indexOf(observer);
			if (index > -1) {
				valueObservers[subject][predicate].splice(index, 1);
				cleanUpValueObservers(subject, predicate);
			}
		}
	}

	function cleanUpValueObservers(subject, predicate) {
		if (valueObservers[subject] && valueObservers[subject][predicate].length == 0) {
			delete valueObservers[subject][predicate];
			if (Object.keys(valueObservers[subject]).length === 0) {
				delete valueObservers[subject];
			}
		}
	}

	this.removeTypeObserver = function(type, predicate, observer) {
		if (typeObservers[type]) {
			var index = typeObservers[type].indexOf(observer);
			if (index > -1) {
				typeObservers[type].splice(index, 1);
				if (typeObservers[type].length == 0) {
					delete typeObservers[type];
				}
			}
		}
	}

	this.getValueObservers = function(subject, predicate) {
		if (valueObservers[subject]) {
			if (valueObservers[subject][predicate]) {
				return valueObservers[subject][predicate];
			}
			return flattenArray(Object.values(valueObservers[subject]));
		} else if (subject == null && predicate == null) {
			return flattenArray(Object.keys(valueObservers).map(function(s){return flattenArray(Object.values(valueObservers[s]))}));
		}
		return [];
	}

	this.getTypeObservers = function(type) {
		if (typeObservers[type]) {
			return typeObservers[type];
		} else if (type == null) {
			return flattenArray(Object.keys(typeObservers).map(function(t){return typeObservers[t]}));
		}
		return [];
	}

	function notifyObservers(subject, predicate, value) {
		var observerList = [];
		if (valueObservers[subject] && valueObservers[subject][predicate]) {
			observerList = observerList.concat(valueObservers[subject][predicate]);
		}
		var subjectType = self.findObject(subject, TYPE);
		if (typeObservers[subjectType]) {
			observerList = observerList.concat(typeObservers[subjectType]);
		}
		for (var i = 0; i < observerList.length; i++) {
			if (observerList[i].observedValueChanged) {
				observerList[i].observedValueChanged(subject, subjectType, value);
			}
		}
	}


	///////// ADDING AND REPLACING FUNCTIONS //////////

	this.addTriple = function(subject, predicate, object) {
		if (subject != null && predicate != null && object != null) {
			//console.log(subject, predicate, object)
			var r = store.addTriple(subject, predicate, object);
			if (predicate == CDT) console.log(subject, predicate, this.findObject(subject, predicate));
			return r;
		}
	}

	/**
	 * removes the specified triple from the store. if no object specified, removes the first one found
	 * @param {string=} object (optional)
	 */
	this.removeTriple = function(subject, predicate, object) {
		if (!object) {
			object = this.findObject(subject, predicate);
		}
		return store.removeTriple(subject, predicate, object);
	}

	this.createBlankNode = function() {
		return store.createBlankNode();
	}

	//sets or replaces the object of the given subject and predicate
	this.setTriple = function(subject, predicate, object) {
		this.removeTriple(subject, predicate);
		this.addTriple(subject, predicate, object);
	}

	//sets or replaces a literal value of the given subject and predicate, value can be a list
	this.setValue = function(subject, predicate, value) {
		var currentValue = this.findObjectValue(subject, predicate);
		if (subject && predicate && value != null && value != currentValue && !Number.isNaN(value)) {
			if (Array.isArray(value)) {
				value = value.map(function(v){return N3.Util.createLiteral(v)});
				this.removeTriple(subject, predicate);
				this.addObjectsToList(subject, predicate, value);
			} else {
				this.setTriple(subject, predicate, N3.Util.createLiteral(value));
			}
			notifyObservers(subject, predicate, value);
		}
	}

	/**
	 * adds an object of the given type with the given value. replaces the value if such an object already exists.
	 * can be used without valuePredicate/value to simply get the objectUri and/or add a missing object without a value.
	 * can also be used without subject and predicate, in which case an independent object is added or changed
	 * @param {string=} valuePredicate (optional)
	 * @param {string=} value (optional) */
	this.setObjectValue = function(subject, predicate, objectType, valuePredicate, value) {
		var objectUri;
		if (subject && predicate) {
			objectUri = this.findObjectOfType(subject, predicate, objectType);
		} else if (!subject) {
			objectUri = this.findSubject(TYPE, objectType);
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

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	this.addObjectToList = function(subject, predicate, object) {
		var listUri = this.findObject(subject, predicate);
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

	/** adds all objects in the given array to the list
	 * @param {Array=} objects (optional) */
	this.addObjectsToList = function(subject, predicate, objects) {
		for (var i = 0, j = objects.length; i < j; i++) {
			this.addObjectToList(subject, predicate, objects[i]);
		}
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	//returns the object that was there before
	this.replaceObjectInList = function(subject, predicate, object, index) {
		var listUri = this.findObject(subject, predicate);
		var elementAtIndex = getElementAt(listUri, index);
		var previousObject = this.findObject(elementAtIndex, FIRST);
		this.setTriple(elementAtIndex, FIRST, object);
		return previousObject;
	}

	this.removeObjectFromList = function(subject, predicate, index) {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		var elementBeforeIndex = getElementAt(listUri, index-1);
		var elementAtIndex = self.findObject(elementBeforeIndex, REST);
		var elementAfterIndex = self.findObject(elementAtIndex, REST);
		this.setTriple(elementBeforeIndex, REST, elementAfterIndex);
		this.removeTriple(elementAtIndex, FIRST);
		this.removeTriple(elementAtIndex, REST);
	}

	//deletes the list with the given uri from the store
	this.deleteList = function(subject, predicate) {
		var listUri = this.findObject(subject, predicate);
		if (listUri) {
			var currentRest = listUri;
			while (currentRest != NIL) {
				this.removeTriple(currentRest, FIRST);
				var nextRest = self.findObject(currentRest, REST);
				this.removeTriple(currentRest, REST);
				currentRest = nextRest;
			}
			this.removeTriple(subject, predicate);
		}
	}


	///////// QUERYING FUNCTIONS //////////

	//calls regular store.find function
	this.find = function(subject, predicate, object) {
		return store.find(subject, predicate, object);
	}

	//returns the object of the first result found in the store
	this.findObject = function(subject, predicate) {
		if (subject && predicate) {
			var results = store.find(subject, predicate);
			if (results.length > 0) {
				return results[0].object;
			}
		}
	}

	//returns the object of the first result found in the store, or all elements if it is a list
	this.findObjectOrList = function(subject, predicate) {
		return getListElementsIfList(this.findObject(subject, predicate));
	}

	//returns the value of the first object found in the store, or all element values if it is a list
	this.findObjectValue = function(subject, predicate) {
		var object = this.findObjectOrList(subject, predicate);
		if (object) {
			if (Array.isArray(object)) {
				return object.map(getLiteralValue);
			}
			return getLiteralValue(object);
		}
	}

	/** returns the first object of the given type it can find under the given subject and predicate
	 * if subject is omitted, just returns the first object of the given type */
	this.findObjectOfType = function(subject, predicate, type) {
		var objectUri;
		if (!subject) {
			objectUri = this.findSubject(TYPE, type);
		} else {
			var allObjects = this.findAllObjects(subject, predicate);
			var objectsOfType = this.findAllSubjects(TYPE, type);
			var results = intersectArrays(allObjects, objectsOfType);
			if (results.length > 0) {
				objectUri = results[0];
			}
		}
		return objectUri;
	}

	this.findObjectValueOfType = function(subject, predicate, type, valuePredicate) {
		var objectUri = this.findObjectOfType(subject, predicate, type);
		return this.findObjectValue(objectUri, valuePredicate);
	}

	//returns the object uris of all results found in the store, including the list elements if they are lists
	this.findAllObjects = function(subject, predicate) {
		var allObjects = store.find(subject, predicate).map(function(t){return t.object;});
		allObjects = allObjects.map(getListElementsIfList);
		return flattenArray(allObjects);
	}

	//returns the object values of all results found in the store, including the list elements if they are lists
	this.findAllObjectValues = function(subject, predicate) {
		var values = this.findAllObjects(subject, predicate).filter(N3.Util.isLiteral);
		return values.map(getLiteralValue);
	}

	this.findAllObjectValuesOfType = function(subject, predicate, valuePredicate) {
		var objectValues = [];
		var objectUris = this.findAllObjects(subject, predicate);
		for (var i = 0, j = objectUris.length; i < j; i++) {
			var value = self.findObjectValue(objectUris[i], valuePredicate);
			if (value != null) {
				objectValues.push(value);
			}
		}
		return objectValues;
	}

	//returns the uri of the subject of the first result found in the store, object doesn't have to be a uri
	this.findSubject = function(predicate, object) {
		var subject = getSubject(predicate, object);
		if (!subject) {
			//try again with literal
			subject = getSubject(predicate, N3.Util.createLiteral(object));
		}
		return subject;
	}

	function getSubject(predicate, object) {
		var results = store.find(null, predicate, object);
		if (results.length > 0) {
			return results[0].subject;
		}
	}
	/** returns the subjects of all results found in the store
	 * @param {number|string|boolean=} object (optional)
	 * @suppress {checkTypes} because of Array.from :( */
	this.findAllSubjects = function(predicate, object) {
		var results = store.find(null, predicate, object);
		if (results.length == 0) {
			results = store.find(null, predicate, N3.Util.createLiteral(object));
		}
		return Array.from(new Set(results.map(function(t){return t.subject;})));
	}

	this.findObjectIndexInList = function(subject, predicate, object) {
		if (subject && predicate) {
			return getIndexInList(this.findObject(subject, predicate), object);
		}
	}

	this.findObjectInListAt = function(subject, predicate, index) {
		if (subject && predicate) {
			var element = getElementAt(this.findObject(subject, predicate), index);
			if (element) {
				return self.findObject(element, FIRST);
			}
		}
	}

	this.findContainingLists = function(object) {
		var subjectUris = [];
		var predicateUris = [];
		var listElements = this.findAllSubjects(FIRST, object);
		for (var i = 0; i < listElements.length; i++) {
			var currentElement = listElements[i];
			var currentPredecessor = this.findSubject(REST, currentElement);
			while (currentPredecessor) {
				currentElement = currentPredecessor;
				currentPredecessor = this.findSubject(REST, currentElement);
			}
			var listOrigin = this.find(null, null, currentElement)[0];
			subjectUris[i] = listOrigin.subject;
			predicateUris[i] = listOrigin.predicate;
		}
		return [subjectUris, predicateUris];
	}

	/** return all triples about the given uri and its affiliated objects, stops at objects of the given type
	 *  @param {string=} type (optional) */
	this.recursiveFindAllTriples = function(uri, type) {
		//find all triples for given uri
		var triples = store.find(uri, null, null);
		var subTriples = [];
		for (var i = triples.length-1; i >= 0; i--) {
			//remove all triples whose object is of the given type
			if (type && store.find(triples[i].object, TYPE, type).length > 0) {
				triples.splice(i, 1);
			} else {
				subTriples = subTriples.concat(this.recursiveFindAllTriples(triples[i].object, type));
			}
		}
		return triples.concat(subTriples);
	}

	/** removes all triples about the given uri and its affiliated objects, stops at objects of the given type
	 *  @param {string=} type (optional) */
	this.recursiveDeleteAllTriples = function(uri, type) {
		var allTriples = this.recursiveFindAllTriples(uri, type);
		for (var i = 0; i < allTriples.length; i++) {
			var currenSubject = allTriples[i].subject;
			this.removeTriple(currenSubject, allTriples[i].predicate, allTriples[i].object);
			var allRefsToSubject = this.find(null, null, currenSubject);
			for (var j = 0; j < allRefsToSubject.length; j++) {
				this.removeTriple(allRefsToSubject[j].subject, allRefsToSubject[j].predicate, allRefsToSubject[j].object);
			}
		}
	}

	this.recursiveFindAllSubClasses = function(superclassUri) {
		var subClasses = this.findAllSubjects(RDFS_URI+"subClassOf", superclassUri);
		for (var i = 0; i < subClasses.length; i++) {
			var subsubClasses = this.recursiveFindAllSubClasses(subClasses[i]);
			if (subsubClasses) {
				subClasses = subClasses.concat(subsubClasses);
			}
		}
		return subClasses;
	}

	this.isSubclassOf = function(class1, class2) {
		var superClass = this.findObject(class1, RDFS_URI+"subClassOf");
		while (superClass) {
			if (superClass == class2) {
				return true;
			}
			superClass = this.findObject(superClass, RDFS_URI+"subClassOf");
		}
		return false;
	}

	this.isSubtypeOf = function(type1, type2) {
		var superType = this.findObject(type1, TYPE);
		while (superType) {
			if (superType == type2) {
				return true;
			}
			superType = this.findObject(superType, TYPE);
		}
		return false;
	}

	//returns all elements of a list if the given uri is a list, the given listUri otherwise
	function getListElementsIfList(listUri) {
		if (listUri) {
			var first = self.findObject(listUri, FIRST);
			if (first) {
				var objectUris = [];
				objectUris.push(first);
				var currentRest = self.findObject(listUri, REST);
				while (currentRest != NIL) {
					objectUris.push(self.findObject(currentRest, FIRST));
					currentRest = self.findObject(currentRest, REST);
				}
				return objectUris;
			}
			return listUri;
		}
	}

	//returns the index of the given element in the given list, -1 if not found
	function getIndexInList(listUri, elementUri) {
		var index = 0;
		var currentRest = listUri;
		while (currentRest != NIL) {
			if (self.findObject(currentRest, FIRST) == elementUri) {
				return index;
			}
			currentRest = self.findObject(currentRest, REST);
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
			var nextRest = self.findObject(currentRest, REST);
			while (nextRest != NIL && (index == null || currentIndex < index)) {
				currentRest = nextRest;
				nextRest = self.findObject(currentRest, REST);
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
