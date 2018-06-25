import * as N3 from 'n3';
import * as _ from 'lodash';
import { promises as jsonld } from 'jsonld';
import { flattenArray, removeDuplicates } from 'arrayutils';
import { RDFS_URI, TYPE, FIRST, REST, NIL, VALUE, DYMO, RENDERING } from '../globals/uris';
import { Observer } from '../globals/types';
import { Fetcher, FetchFetcher } from '../util/fetcher';

//limited interface to ensure optimal use here!
export interface N3Store {
	_id: number,
	_ids: {},
	_entities: {},
	_graphs: {},
	size: number,
	addTriple: (subject: string | N3Triple, predicate?: string, object?: string) => void,
	removeTriple: (subject: string, predicate: string, object?: string) => void,
	createBlankNode: () => string,
	countTriplesByIRI: (subject: string, predicate: string, object: string) => number,
	getTriplesByIRI: (subject: string, predicate: string, object: string) => N3Triple[],
	getSubjectsByIRI: (predicate: string, object: string) => string[],
	getObjectsByIRI: (subject: string, predicate: string) => string[]
}

export interface N3Triple {
	subject: string,
	predicate: string,
	object: string
}

interface ListElement {
	index: number,
	value: any
}

/**
 * A graph store based on N3 that easily manages lists, value replacing and observing,
 * and offers some nice querying functions
 * @constructor
 */
export class EasyStore {

	private store: N3Store = N3.Store();
	private fetcher: Fetcher = new FetchFetcher();
	private valueObservers = {};
	private typeObservers = {};
	private valueBuffer = {};

  constructor() {}

	setFetcher(fetcher: Fetcher) {
		this.fetcher = fetcher;
	}

	size(): number {
		return this.store.size;
	}


	///////// OBSERVING FUNCTIONS //////////

	addValueObserver(subject: string, predicate: string, observer: Observer) {
		//console.log("OBS", subject, predicate, [observer])
		if (observer) {
			if (!this.valueObservers[subject]) {
				this.valueObservers[subject] = {};
			}
			if (!this.valueObservers[subject][predicate]) {
				this.valueObservers[subject][predicate] = [];
			}
			this.valueObservers[subject][predicate].push(observer);
			//notifyObservers(subject, predicate, this.findObjectValue(subject, predicate));
		}
	}

	addTypeObserver(type: string, observer: Observer) {
		if (!this.typeObservers[type]) {
			this.typeObservers[type] = [];
		}
		this.typeObservers[type].push(observer);
	}

	removeValueObserver(subject: string, predicate: string, observer: Observer) {
		if (this.valueObservers[subject] && this.valueObservers[subject][predicate]) {
			var index = this.valueObservers[subject][predicate].indexOf(observer);
			if (index > -1) {
				this.valueObservers[subject][predicate].splice(index, 1);
				this.cleanUpValueObservers(subject, predicate);
			}
		}
	}

	private cleanUpValueObservers(subject: string, predicate: string) {
		if (this.valueObservers[subject] && this.valueObservers[subject][predicate].length == 0) {
			delete this.valueObservers[subject][predicate];
			if (Object.keys(this.valueObservers[subject]).length === 0) {
				delete this.valueObservers[subject];
			}
		}
	}

	removeTypeObserver(type: string, observer: Observer) {
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

	getValueObserverCount(): number {
		var observers = [];
		_.values(this.valueObservers).forEach(os => _.values(os).forEach(olist => observers.push(olist)));
		return _.flatten(observers).length;
	}

	getValueObservers(subject: string, predicate: string): Observer[] {
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
		if (subjectType && this.typeObservers[subjectType]) {
			observerList = observerList.concat(this.typeObservers[subjectType]);
		}
		for (var i = 0; i < observerList.length; i++) {
			if (observerList[i].observedValueChanged) {
				observerList[i].observedValueChanged(subject, subjectType, value);
			}
		}
	}


	///////// ADDING AND REPLACING FUNCTIONS //////////

	addTriple(subject: string, predicate: string, object: string) {
		if (subject != null && predicate != null && object != null) {
			return this.store.addTriple(subject, predicate, object);
		}
	}

	/**
	 * removes the specified triple from the store. if no object specified, removes the first one found
	 * really slow in n3js, use carefully!
	 */
	removeTriple(subject: string, predicate: string, object?: string): string {
		if (!object) {
			object = this.findObject(subject, predicate);
			if (object) {
				this.store.removeTriple(subject, predicate, object);
			}
		} else if (this.store.countTriplesByIRI(subject, predicate, object) > 0) {
			this.store.removeTriple(subject, predicate, object);
		}
		return object;
	}

	createBlankNode() {
		return this.store.createBlankNode();
	}

	//sets or replaces the object of the given subject and predicate
	setTriple(subject: string, predicate: string, object: string) {
		let oldObject = this.findObject(subject, predicate);
		if (oldObject) {
			this.replaceObjectInTriple(subject, predicate, oldObject, object);
		} else {
			this.addTriple(subject, predicate, object);
		}
	}

	private replaceObjectInTriple(subject: string, predicate: string, oldObject: string, newObject: string) {
		let graph = this.store._graphs[''];
		var ids = this.store._ids;
		let subjectId = ids[subject], predicateId = ids[predicate], oldObjectId = ids[oldObject];
		let newObjectId = ids[newObject] || (ids[this.store._entities[++this.store._id] = newObject] = this.store._id);
		this.editStoreIndex(graph.subjects, subjectId, predicateId, newObjectId, oldObjectId, 2);
		this.editStoreIndex(graph.predicates, predicateId, newObjectId, subjectId, oldObjectId, 1);
		this.editStoreIndex(graph.objects, newObjectId, subjectId, predicateId, oldObjectId, 0);
	}

	private editStoreIndex(index0: {}, key0: number, key1: number, key2: number, oldKey: number, position: number) {
		// Create layers as necessary
		var index1 = index0[key0] || (index0[key0] = {});
		var index2 = index1[key1] || (index1[key1] = {});
		// Setting the key to _any_ value signals the presence of the triple
		index2[key2] = null;

		if (position == 2) {
			// remove old key
			delete index2[oldKey];
		} else if (position == 1) {
			let oldIndex2 = index1[oldKey];
			delete oldIndex2[key2];
			if (_.size(oldIndex2) == 0) delete index1[oldKey];
		} else if (position == 0) {
			let oldIndex1 = index0[oldKey];
			let oldIndex2 = oldIndex1[key1];
			delete oldIndex2[key2];
			if (_.size(oldIndex2) == 0) delete oldIndex1[key1];
			if (_.size(oldIndex1) == 0) delete index0[oldKey];
		}

	}

	//sets or replaces a literal value of the given subject and predicate, value can be a list
	setValue(subject: string, predicate: string, value) {
		if (subject && predicate && value != null) {
			var currentValue = this.findObjectValue(subject, predicate);
			if (value != currentValue && !Number.isNaN(value)) {
				if (Array.isArray(value)) {
					value = value.map(v => N3.Util.createLiteral(v));
					this.removeTriple(subject, predicate);
					value.forEach(v => this.addObjectToList(subject, predicate, v));
				} else {
					this.setTriple(subject, predicate, N3.Util.createLiteral(value));
				}
				this.notifyObservers(subject, predicate, value);
			}
		}
	}

	/**
	 * adds an object of the given type with the given value. replaces the value if such an object already exists.
	 * can be used without valuePredicate/value to simply get the objectUri and/or add a missing object without a value.
	 * can also be used without subject and predicate, in which case an independent object is added or changed
	 */
	setObjectValue(subject: string, predicate: string, objectType: string, valuePredicate?: string, value?: any): string {
		var objectUri;
		if (subject && predicate) {
			objectUri = this.findObjectOfType(subject, predicate, objectType);
		} else if (!subject) {
			objectUri = this.findSubject(TYPE, objectType);
		}
		if (!objectUri) {
			objectUri = this.createBlankNode();
			//console.log(objectUri, subject, predicate, objectType, valuePredicate)
			if (subject && predicate) {
				this.addTriple(subject, predicate, objectUri);
			}
			this.addTriple(objectUri, TYPE, objectType);
		}
		if (valuePredicate) {
			this.setValue(objectUri, valuePredicate, value);
		}
		return objectUri;
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	//returns the index at which the element was added
	addObjectToList(subject: string, predicate: string, object: string): number {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		var index;
		if (!listUri) {
			this.addTriple(subject, predicate, newElement);
			index = 0;
		} else {
			var lastElement = this.getLastElement(listUri);
			index = lastElement.index+1;
			//replaces NIL with newElement
			this.setTriple(lastElement.value, REST, newElement);
		}
		this.addTriple(newElement, FIRST, object);
		this.addTriple(newElement, REST, NIL);
		return index;
	}

	addObjectsToList(subject: string, predicate: string, objects: string[]): void {
		objects.forEach(o => this.addObjectToList(subject, predicate, o));
	}

	//adds the given object to the list the given subject has under the given predicate, creates the list if none yet
	//returns the object that was there before
	replaceObjectInList(subject: string, predicate: string, object, index: number) {
		var listUri = this.findObject(subject, predicate);
		var elementAtIndex = this.getElementAt(listUri, index);
		var previousObject = this.findObject(elementAtIndex.value, FIRST);
		this.setTriple(elementAtIndex.value, FIRST, object);
		return previousObject;
	}

	insertObjectIntoList(subject: string, predicate: string, object, index: number) {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		this.addTriple(newElement, FIRST, object);
		var nextElement = this.getElementAt(listUri, index);
		this.addTriple(newElement, REST, nextElement.value);
		if (index > 0) {
			//set previous element rest to new element
			var previousElement = this.getElementAt(listUri, index-1);
			this.setTriple(previousElement.value, REST, newElement);
		} else {
			//set list head to new element
			this.setTriple(subject, predicate, newElement);
		}
	}

	removeObjectFromList(subject: string, predicate: string, index: number) {
		var listUri = this.findObject(subject, predicate);
		var newElement = this.createBlankNode();
		var elementBeforeIndex = this.getElementAt(listUri, index-1);
		var elementAtIndex = this.findObject(elementBeforeIndex.value, REST);
		var elementAfterIndex = this.findObject(elementAtIndex, REST);
		this.setTriple(elementBeforeIndex.value, REST, elementAfterIndex);
		this.removeTriple(elementAtIndex, FIRST);
		this.removeTriple(elementAtIndex, REST, elementAfterIndex);
	}

	/**deletes all elements from the given list, starting with the one at the given index*/
	deleteListFrom(subject: string, predicate: string, index?: number): string[] {
		var listUri = this.findObject(subject, predicate);
		if (listUri) {
			var removed = [];
			var currentRest = listUri;
			var currentIndex = 0;
			while (currentRest != NIL) {
				var nextRest = this.findObject(currentRest, REST);
				if (currentIndex == index-1) {
					this.setTriple(currentRest, REST, NIL);
				} else if (!index || currentIndex >= index) {
					this.removeTriple(currentRest, REST);
					removed.push(this.removeTriple(currentRest, FIRST));
				}
				currentRest = nextRest;
				currentIndex++;
			}
			if (!index) {
				this.removeTriple(subject, predicate, listUri);
			}
			return removed;
		}
	}


	///////// QUERYING FUNCTIONS //////////

	//calls regular store.find function
	find(subject: string, predicate?: string, object?: string) {
		return this.store.getTriplesByIRI(subject, predicate, object);
	}

	//returns the object of the first result found in the store
	findObject(subject: string, predicate: string): string {
		return this.store.getObjectsByIRI(subject, predicate)[0];
	}

	//returns the object of the first result found in the store, or all elements if it is a list
	findObjectOrList(subject: string, predicate: string) {
		return this.getListElementsIfList(this.findObject(subject, predicate));
	}

	//returns the value of the first object found in the store, or all element values if it is a list
	findObjectValue(subject: string, predicate: string) {
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
	findObjectOfType(subject: string, predicate: string, type: string) {
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

	findObjectValueOfType(subject: string, predicate: string, type: string, valuePredicate: string) {
		var objectUri = this.findObjectOfType(subject, predicate, type);
		if (objectUri) {
			return this.findObjectValue(objectUri, valuePredicate);
		}
	}

	//returns the object uris of all results found in the store, including the list elements if they are lists
	findAllObjects(subject: string, predicate: string): string[] {
		var allObjects = this.store.getObjectsByIRI(subject, predicate);
		allObjects = allObjects.map(this.getListElementsIfList, this);
		return flattenArray(allObjects);
	}

	//returns the object values of all results found in the store, including the list elements if they are lists
	findAllObjectValues(subject: string, predicate: string): any[] {
		var values = this.findAllObjects(subject, predicate).filter(N3.Util.isLiteral);
		return values.map(this.getLiteralValue, this);
	}

	findAllObjectValuesOfType(subject: string, predicate: string, valuePredicate: string): any[] {
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

	//returns the first subject uri found in the store, object doesn't have to be a uri
	findSubject(predicate: string, object: any): string {
		var subjects = this.findSubjects(predicate, object);
		if (subjects.length > 0) {
			return subjects[0];
		}
	}

	//returns the uris of all subjects found in the store, object doesn't have to be a uri
	findSubjects(predicate: string, object: any): string[] {
		var subjects = this.store.getSubjectsByIRI(predicate, object);
		if (subjects.length == 0) {
			//try again with literal
			subjects = this.store.getSubjectsByIRI(predicate, N3.Util.createLiteral(object));
		}
		return subjects;
	}

	findObjectIndexInList(subject: string, predicate: string, object) {
		if (subject && predicate) {
			return this.getIndexInList(this.findObject(subject, predicate), object);
		}
	}

	findObjectInListAt(subject: string, predicate: string, index: number) {
		if (subject && predicate) {
			var element = this.getElementAt(this.findObject(subject, predicate), index);
			if (element) {
				return this.findObject(element.value, FIRST);
			}
		}
	}

	//returns the subjects of all lists containing the given object at the given predicate
	//predicate must be given for optimization
	findContainingLists(object: string, predicate: string): string[] {
		var subjectUris = [];
		var listElements = this.findSubjects(FIRST, object);
		for (var i = 0; i < listElements.length; i++) {
			var currentElement = listElements[i];
			var currentPredecessor = this.findSubject(REST, currentElement);
			while (currentPredecessor) {
				currentElement = currentPredecessor;
				currentPredecessor = this.findSubject(REST, currentElement);
			}
			var currentListOwner = this.findSubject(predicate, currentElement);
			if (currentListOwner) {
				subjectUris.push(currentListOwner);
			}
		}
		return subjectUris;
	}

	/** return all triples about the given uri and its affiliated objects, stops at objects of the given type, or
		at the given predicates */
	recursiveFindAllTriples(uri, type?: string, predicates?: string[]) {
		//find all triples for given uri
		let triples = this.store.getTriplesByIRI(uri, null, null);
		if (predicates) {
			triples = triples.filter(t => predicates.indexOf(t.predicate) < 0);
		}
		if (type) {
			triples = triples.filter(t => this.store.getTriplesByIRI(t.object, TYPE, type).length == 0);
		}
		let subTriples = _.flatMap(triples, t => this.recursiveFindAllTriples(t.object, type, predicates));
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
		var subClasses = this.findSubjects(RDFS_URI+"subClassOf", superclassUri);
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
					var first = this.findObject(currentRest, FIRST);
					var rest = this.findObject(currentRest, REST);
					if (first && rest) {
						objectUris.push(first);
						currentRest = rest;
					} else {
						throw "Trying to get elements from an illdefined list (with missing first or rest)"
					}
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

	private getLastElement(listUri: string): ListElement {
		return this.getElementAt(listUri);
	}

	/**
	 * returns the uri of the element at the given index in the given list, undefined if not found
	 * returns uri of last element if no index given
	 */
	private getElementAt(listUri: string, index?: number): ListElement {
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
				return {index: currentIndex, value: currentRest};
			}
		}
	}

	getLiteralValue(uri) {
		var value = N3.Util.getLiteralValue(uri);
		var type = N3.Util.getLiteralType(uri);
		if (type === "http://www.w3.org/2001/XMLSchema#boolean") {
			return value == "true";
		} else if (type !== "http://www.w3.org/2001/XMLSchema#string") {
			return Number(value);
		}
		return value;
	}


	///////// LOADING FUNCTIONS //////////

	loadData(data: string): Promise<any> {
		//TODO NOT SURE IF THIS WORKS...
		return new Promise((resolve, reject) =>
			this.jsonldToNquads(data)
			.then(nquads => {
				N3.Parser(null).parse(nquads, (error, triple: N3Triple, prefixes) => {
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
		return this.fetcher.fetchText(path)
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
		var allTriples = this.store.getTriplesByIRI(null, null, null);
		return this.triplesToRdf(allTriples);
	}

	triplesToRdf(triples): Promise<string> {
		return new Promise(resolve => {
			var writer = N3.Writer({ format: 'application/nquads' }, null);
			for (var i = 0; i < triples.length; i++) {
				writer.addTriple(triples[i]);
			}
			writer.end((err, rdf) => resolve(rdf));
		});
	}

	logData() {
		var rows = this.store.getTriplesByIRI(null, null, null).map(t => t.subject + "\t" + t.predicate + "\t" + t.object);
		for (var i in rows) {
			console.log(rows[i]);
		}
	}

}
