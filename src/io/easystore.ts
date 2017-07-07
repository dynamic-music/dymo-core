import { Store, Parser, Writer, Util } from 'n3'
import { promises as jsonld } from 'jsonld';
import { flattenArray, removeDuplicates } from 'arrayutils'
import { RDFS_URI, TYPE, FIRST, REST, NIL } from '../globals/uris'

/**
 * A graph store based on N3 that easily manages lists, value replacing and observing,
 * and offers some nice querying functions
 * @constructor
 */
export class EasyStore {

	private store = Store(null, null);
	private valueObservers = {};
	private typeObservers = {};


	///////// OBSERVING FUNCTIONS //////////

	addValueObserver(subject, predicate, observer) {
		if (!this.valueObservers[subject]) {
			this.valueObservers[subject] = {};
		}
		if (!this.valueObservers[subject][predicate]) {
			this.valueObservers[subject][predicate] = [];
		}
		this.valueObservers[subject][predicate].push(observer);
		//notifyObservers(subject, predicate, this.findObjectValue(subject, predicate));
	}

	addTypeObserver(type, predicate, observer) {
		if (!this.typeObservers[type]) {
			this.typeObservers[type] = [];
		}
		this.typeObservers[type].push(observer);
	}

	removeValueObserver(subject, predicate, observer) {
		if (this.valueObservers[subject] && this.valueObservers[subject][predicate]) {
			var index = this.valueObservers[subject][predicate].indexOf(observer);
			if (index > -1) {
				this.valueObservers[subject][predicate].splice(index, 1);
				this.cleanUpValueObservers(subject, predicate);
			}
		}
	}

	private cleanUpValueObservers(subject, predicate) {
		if (this.valueObservers[subject] && this.valueObservers[subject][predicate].length == 0) {
			delete this.valueObservers[subject][predicate];
			if (Object.keys(this.valueObservers[subject]).length === 0) {
				delete this.valueObservers[subject];
			}
		}
	}

	removeTypeObserver(type, predicate, observer) {
		if (this.typeObservers[type]) {
			var index = this.typeObservers[type].indexOf(observer);
			if (index > -1) {
				this.typeObservers[type].splice(index, 1);
				if (this.typeObservers[type].length == 0) {
					delete this.typeObservers[type];
				}
			}
		}
	}

	getValueObservers(subject, predicate) {
		if (this.valueObservers[subject]) {
			if (this.valueObservers[subject][predicate]) {
				return this.valueObservers[subject][predicate];
			}
			return flattenArray(Object.keys(this.valueObservers[subject]).map(key => this.valueObservers[subject][key]));
		} else if (subject == null && predicate == null) {
			return flattenArray(Object.keys(this.valueObservers).map(s => flattenArray(Object.keys(this.valueObservers[s]).map(key => this.valueObservers[s][key]))));
		}
		return [];
	}

	getTypeObservers(type) {
		if (this.typeObservers[type]) {
			return this.typeObservers[type];
		} else if (type == null) {
			return flattenArray(Object.keys(this.typeObservers).map(t => this.typeObservers[t]));
		}
		return [];
	}

	private notifyObservers(subject, predicate, value) {
		var observerList = [];
		if (this.valueObservers[subject] && this.valueObservers[subject][predicate]) {
			observerList = observerList.concat(this.valueObservers[subject][predicate]);
		}
		var subjectType = this.findObject(subject, TYPE);
		if (this.typeObservers[subjectType]) {
			observerList = observerList.concat(this.typeObservers[subjectType]);
		}
		for (var i = 0; i < observerList.length; i++) {
			if (observerList[i].observedValueChanged) {
				observerList[i].observedValueChanged(subject, subjectType, value);
			}
		}
	}


	///////// ADDING AND REPLACING FUNCTIONS //////////

	addTriple(subject, predicate, object) {
		if (subject != null && predicate != null && object != null) {
			return this.store.addTriple(subject, predicate, object);
		}
	}

	/**
	 * removes the specified triple from the store. if no object specified, removes the first one found
	 */
	removeTriple(subject, predicate, object?: string) {
		if (!object) {
			object = this.findObject(subject, predicate);
		}
		return this.store.removeTriple(subject, predicate, object);
	}

	createBlankNode() {
		return this.store.createBlankNode();
	}

	//sets or replaces the object of the given subject and predicate
	setTriple(subject, predicate, object) {
		this.removeTriple(subject, predicate);
		this.addTriple(subject, predicate, object);
	}

	//sets or replaces a literal value of the given subject and predicate, value can be a list
	setValue(subject, predicate, value) {
		var currentValue = this.findObjectValue(subject, predicate);
		if (subject && predicate && value != null && value != currentValue && !Number.isNaN(value)) {
			if (Array.isArray(value)) {
				value = value.map(v => Util.createLiteral(v));
				this.removeTriple(subject, predicate);
				this.addObjectsToList(subject, predicate, value);
			} else {
				this.setTriple(subject, predicate, Util.createLiteral(value));
			}
			this.notifyObservers(subject, predicate, value);
		}
	}

	/**
	 * adds an object of the given type with the given value. replaces the value if such an object already exists.
	 * can be used without valuePredicate/value to simply get the objectUri and/or add a missing object without a value.
	 * can also be used without subject and predicate, in which case an independent object is added or changed
	 */
	setObjectValue(subject, predicate, objectType, valuePredicate?: string, value?: string) {
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
	addObjectToList(subject, predicate, object) {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		if (!listUri) {
			this.addTriple(subject, predicate, newElement);
		} else {
			var lastElement = this.getLastElement(listUri);
			this.removeTriple(lastElement, REST, NIL);
			this.addTriple(lastElement, REST, newElement);
		}
		this.addTriple(newElement, FIRST, object);
		this.addTriple(newElement, REST, NIL);
	}

	/** adds all objects in the given array to the list */
	addObjectsToList(subject, predicate, objects?: string[]) {
		for (var i = 0, j = objects.length; i < j; i++) {
			this.addObjectToList(subject, predicate, objects[i]);
		}
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	//returns the object that was there before
	replaceObjectInList(subject, predicate, object, index) {
		var listUri = this.findObject(subject, predicate);
		var elementAtIndex = this.getElementAt(listUri, index);
		var previousObject = this.findObject(elementAtIndex, FIRST);
		this.setTriple(elementAtIndex, FIRST, object);
		return previousObject;
	}

	removeObjectFromList(subject, predicate, index) {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		var elementBeforeIndex = this.getElementAt(listUri, index-1);
		var elementAtIndex = this.findObject(elementBeforeIndex, REST);
		var elementAfterIndex = this.findObject(elementAtIndex, REST);
		this.setTriple(elementBeforeIndex, REST, elementAfterIndex);
		this.removeTriple(elementAtIndex, FIRST);
		this.removeTriple(elementAtIndex, REST);
	}

	//deletes the list with the given uri from the store
	deleteList(subject, predicate) {
		var listUri = this.findObject(subject, predicate);
		if (listUri) {
			var currentRest = listUri;
			while (currentRest != NIL) {
				this.removeTriple(currentRest, FIRST);
				var nextRest = this.findObject(currentRest, REST);
				this.removeTriple(currentRest, REST);
				currentRest = nextRest;
			}
			this.removeTriple(subject, predicate);
		}
	}


	///////// QUERYING FUNCTIONS //////////

	//calls regular store.find function
	find(subject: string, predicate?: string, object?: string) {
		return this.store.find(subject, predicate, object);
	}

	//returns the object of the first result found in the store
	findObject(subject, predicate) {
		if (subject && predicate) {
			var results = this.store.find(subject, predicate);
			if (results.length > 0) {
				return results[0].object;
			}
		}
	}

	//returns the object of the first result found in the store, or all elements if it is a list
	findObjectOrList(subject, predicate) {
		return this.getListElementsIfList(this.findObject(subject, predicate));
	}

	//returns the value of the first object found in the store, or all element values if it is a list
	findObjectValue(subject, predicate) {
		var object = this.findObjectOrList(subject, predicate);
		if (object) {
			if (Array.isArray(object)) {
				return object.map(this.getLiteralValue, this);
			}
			return this.getLiteralValue(object);
		}
	}

	/** returns the first object of the given type it can find under the given subject and predicate
	 * if subject is omitted, just returns the first object of the given type */
	findObjectOfType(subject, predicate, type) {
		if (predicate && type) {
			if (!subject) {
				return this.findSubject(TYPE, type);
			} else {
				var allObjects = this.findAllObjects(subject, predicate);
				for (var i = 0, ii = allObjects.length; i < ii; i++) {
					if (this.find(allObjects[i], TYPE, type).length > 0) {
						return allObjects[i];
					}
				}
			}
		}
	}

	findObjectValueOfType(subject, predicate, type, valuePredicate) {
		var objectUri = this.findObjectOfType(subject, predicate, type);
		return this.findObjectValue(objectUri, valuePredicate);
	}

	//returns the object uris of all results found in the store, including the list elements if they are lists
	findAllObjects(subject, predicate) {
		var allObjects = this.store.find(subject, predicate).map(t => t.object);
		allObjects = allObjects.map(this.getListElementsIfList, this);
		return flattenArray(allObjects);
	}

	//returns the object values of all results found in the store, including the list elements if they are lists
	findAllObjectValues(subject, predicate) {
		var values = this.findAllObjects(subject, predicate).filter(Util.isLiteral);
		return values.map(this.getLiteralValue, this);
	}

	findAllObjectValuesOfType(subject, predicate, valuePredicate) {
		var objectValues = [];
		var objectUris = this.findAllObjects(subject, predicate);
		for (var i = 0, j = objectUris.length; i < j; i++) {
			var value = this.findObjectValue(objectUris[i], valuePredicate);
			if (value != null) {
				objectValues.push(value);
			}
		}
		return objectValues;
	}

	//returns the uri of the subject of the first result found in the store, object doesn't have to be a uri
	findSubject(predicate, object) {
		var subject = this.getSubject(predicate, object);
		if (!subject) {
			//try again with literal
			subject = this.getSubject(predicate, Util.createLiteral(object));
		}
		return subject;
	}

	private getSubject(predicate, object) {
		var results = this.store.find(null, predicate, object);
		if (results.length > 0) {
			return results[0].subject;
		}
	}
	/** returns the subjects of all results found in the store */
	findAllSubjects(predicate, object?) {
		var results = this.store.find(null, predicate, object);
		if (results.length == 0) {
			results = this.store.find(null, predicate, Util.createLiteral(object));
		}
		return removeDuplicates(results.map(t => t.subject));
	}

	findObjectIndexInList(subject, predicate, object) {
		if (subject && predicate) {
			return this.getIndexInList(this.findObject(subject, predicate), object);
		}
	}

	findObjectInListAt(subject, predicate, index) {
		if (subject && predicate) {
			var element = this.getElementAt(this.findObject(subject, predicate), index);
			if (element) {
				return this.findObject(element, FIRST);
			}
		}
	}

	findContainingLists(object) {
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
			if (listOrigin) {
				subjectUris[i] = listOrigin.subject;
				predicateUris[i] = listOrigin.predicate;
			}
		}
		return [subjectUris, predicateUris];
	}

	/** return all triples about the given uri and its affiliated objects, stops at objects of the given type, or
		at the given predicates */
	recursiveFindAllTriples(uri, type?: string, predicates?: string[]) {
		//find all triples for given uri
		var triples = this.store.find(uri, null, null);
		var subTriples = [];
		for (var i = triples.length-1; i >= 0; i--) {
			//remove all triples whose object is of the given type
			if (predicates && predicates.indexOf(triples[i].predicate) >= 0) {
				triples.splice(i, 1);
			} else if (type && this.store.find(triples[i].object, TYPE, type).length > 0) {
				triples.splice(i, 1);
			} else {
				subTriples = subTriples.concat(this.recursiveFindAllTriples(triples[i].object, type, predicates));
			}
		}
		return triples.concat(subTriples);
	}

	/** removes all triples about the given uri and its affiliated objects, stops at objects of the given type */
	recursiveDeleteAllTriples(uri, type?: string) {
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

	recursiveFindAllSubClasses(superclassUri) {
		var subClasses = this.findAllSubjects(RDFS_URI+"subClassOf", superclassUri);
		for (var i = 0; i < subClasses.length; i++) {
			var subsubClasses = this.recursiveFindAllSubClasses(subClasses[i]);
			if (subsubClasses) {
				subClasses = subClasses.concat(subsubClasses);
			}
		}
		return subClasses;
	}

	isSubclassOf(class1, class2) {
		var superClass = this.findObject(class1, RDFS_URI+"subClassOf");
		while (superClass) {
			if (superClass == class2) {
				return true;
			}
			superClass = this.findObject(superClass, RDFS_URI+"subClassOf");
		}
		return false;
	}

	isSubtypeOf(type1, type2) {
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
	private getListElementsIfList(listUri) {
		if (listUri) {
			var first = this.findObject(listUri, FIRST);
			if (first) {
				var objectUris = [];
				objectUris.push(first);
				var currentRest = this.findObject(listUri, REST);
				while (currentRest != NIL) {
					objectUris.push(this.findObject(currentRest, FIRST));
					currentRest = this.findObject(currentRest, REST);
				}
				return objectUris;
			}
			return listUri;
		}
	}

	//returns the index of the given element in the given list, -1 if not found
	private getIndexInList(listUri, elementUri) {
		var index = 0;
		var currentRest = listUri;
		while (currentRest != NIL) {
			if (this.findObject(currentRest, FIRST) == elementUri) {
				return index;
			}
			currentRest = this.findObject(currentRest, REST);
			index++;
		}
		return -1;
	}

	private getLastElement(listUri) {
		return this.getElementAt(listUri);
	}

	/**
	 * returns the uri of the element at the given index in the given list, undefined if not found
	 * returns uri of last element if no index given
	 */
	private getElementAt(listUri, index?: number) {
		if (listUri) {
			var currentIndex = 0;
			var currentRest = listUri;
			var nextRest = this.findObject(currentRest, REST);
			while (nextRest != NIL && (index == null || currentIndex < index)) {
				currentRest = nextRest;
				nextRest = this.findObject(currentRest, REST);
				currentIndex++;
			}
			if (index == null || currentIndex == index) {
				return currentRest;
			}
		}
	}

	private getLiteralValue(uri) {
		var value = Util.getLiteralValue(uri);
		var type = Util.getLiteralType(uri);
		if (type != "http://www.w3.org/2001/XMLSchema#string" && type != "http://www.w3.org/2001/XMLSchema#boolean") {
			return Number(value);
		}
		return value;
	}


	///////// LOADING FUNCTIONS //////////

	loadData(data): Promise<any> {
		//TODO NOT SURE IF THIS WORKS...
		return new Promise((resolve, reject) =>
			this.jsonldToNquads(data)
			.then(nquads => {
				Parser(null).parse(nquads, (error, triple, prefixes) => {
					//keep streaming triples
					if (triple) {
						this.store.addTriple(triple);
					//done
					} else if (error) {
						console.log(error)
						reject();
					} else {
						resolve();
					}
				});
			})
			.catch(err => reject(err))
		);
	}

	loadFileIntoStore(path): Promise<any> {
		return fetch(path, { mode:'cors' })
			.then(response => response.text())
			.then(data => this.loadData(data))
			.catch(err => console.log(err));
	}

	private jsonldToNquads(data: string): Promise<string> {
		if (data[0] === '{') {
			return jsonld.toRDF(JSON.parse(data), {format: 'application/nquads'});
		}
		return Promise.resolve(data);
		/*return new Promise((resolve, reject) => {
			if (isJsonld) {
				console.log(data, isJsonld)
				//toRDF(data, {format: 'application/nquads'}, (err, nquads) => {console.log("TOO");nquads ? resolve(nquads): reject(err)});
				resolve(jsonld.toRDF(data, {format: 'application/nquads'})
					.then
			} else {
				resolve(data);
			}
		});*/
	}


	///////// WRITING FUNCTIONS //////////

	toRdf(): Promise<string> {
		var allTriples = this.store.find(null, null, null);
		return this.triplesToRdf(allTriples);
	}

	triplesToRdf(triples): Promise<string> {
		return new Promise(resolve => {
			var writer = Writer({ format: 'application/nquads' }, null);
			for (var i = 0; i < triples.length; i++) {
				writer.addTriple(triples[i]);
			}
			writer.end((err, rdf) => resolve(rdf));
		});
	}

	logData() {
		var rows = this.store.find(null).map(t => t.subject +"\n" + t.predicate + "\n" + t.object);
		for (var i in rows) {
			console.log(rows[i]);
		}
	}

}
