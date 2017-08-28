import 'isomorphic-fetch';
import * as N3 from 'n3';
import { EasyStore } from '../../src/io/easystore';
import { DymoStore } from '../../src/io/dymostore';
import { TYPE, FIRST, REST, NIL, ONSET_FEATURE, FEATURE_TYPE, ACCELEROMETER_X, SENSOR_CONTROL, MOBILE_CONTROL, AMPLITUDE,
	AUDIO_PARAMETER, PARAMETER_TYPE } from '../../src/globals/uris';
import { SERVER_ROOT } from './server';

describe("an easystore", function() {

	var easyStore: EasyStore;

	it("hacks the n3 store for efficiency", function() {
		let store = N3.Store();
		//no triples in store
		expect(store.size).toBe(0);
		//check basic store behavior
		store.addTriple("var", "val", "1");
		expect(store.size).toBe(1);
		expect(store.getObjectsByIRI("var","val")).toEqual(["1"]);
		setObjectValue("var", "val", "2");
		expect(store.size).toBe(1);
		expect(store.getObjectsByIRI("var","val")).toEqual(["2"]);
		store.addTriple("var", "val", "1");

		function setObjectValue(s, p, o) {
			let prevObject = store.getObjectsByIRI(s, p)[0];
			store._entities[store._ids[prevObject]] = o;
		}
	});

	it("can add, remove, and set triples, objects, and values", function() {
		easyStore = new EasyStore();
		//no triples in store
		expect(easyStore.size()).toBe(0);
		//adding, setting, and removing should work
		easyStore.addTriple("musik", "ist", "scheisse");
		expect(easyStore.size()).toBe(1);
		easyStore.addTriple("mokka", "lives", "on");
		expect(easyStore.size()).toBe(2);
		easyStore.setTriple("mokka", "lives", "forever");
		expect(easyStore.size()).toBe(2);
		expect(easyStore.findObject("mokka", "lives")).toBe("forever");
		easyStore.addTriple("nothing", "else", "matters");
		expect(easyStore.size()).toBe(3);
		easyStore.removeTriple("nothing", "else");
		expect(easyStore.size()).toBe(2);
		//incomplete manipulations shouldn't work
		easyStore.addTriple("nothing", "else", null);
		easyStore.addTriple("nothing", null, null);
		easyStore.removeTriple("nothing", null, null);
		expect(easyStore.size()).toBe(2);
		//adding and setting values
		easyStore.setValue("mokka", "number", 1);
		expect(easyStore.findObjectValue("mokka", "number")).toBe(1);
		expect(easyStore.size()).toBe(3);
		easyStore.setValue("mokka", "is", ["always", "number", 1, "and", 3.1415926]);
		expect(easyStore.size()).toBe(14);
		expect(easyStore.findObjectValue("mokka", "is")).toEqual(["always", "number", 1, "and", 3.1415926]);
		easyStore.setValue("mokka", "is", ["always", "the", 1, "and", "only"]);
		expect(easyStore.size()).toBe(24);
		expect(easyStore.findObjectValue("mokka", "is")).toEqual(["always", "the", 1, "and", "only"]);
		//adding and setting object values
		easyStore.setObjectValue("thun", "hat", "bar", "nummer", 1);
		easyStore.setObjectValue("thun", "hat", "fluss");
		expect(easyStore.findObjectValueOfType("thun", "hat", "bar", "nummer")).toEqual(1);
		expect(easyStore.findObjectOfType("thun", "hat", "bar")).not.toBeUndefined();
		expect(easyStore.findObjectValue(easyStore.findObjectOfType("thun", "hat", "bar"), "nummer")).toEqual(1);
		expect(easyStore.findSubject("ist", "scheisse")).toEqual("musik");
		expect(easyStore.findSubject("number", 1)).toEqual("mokka");
		easyStore.setValue("mokka", "number", "one");
		expect(easyStore.findSubject("number", "one")).toEqual("mokka");
		expect(easyStore.findAllObjects("thun", "hat").length).toBe(2);
		expect(easyStore.findAllObjectValues(null, "nummer")).toEqual([1]);
		expect(easyStore.findAllObjects("mokka", null).length).toBe(7);
		expect(easyStore.findAllObjectValues("mokka", null).length).toBe(6);
		expect(easyStore.findAllObjectValues("mokka", null)).toEqual(["always", "the", 1, "and", "only", "one"]);
		expect(easyStore.findAllObjectValuesOfType("thun","hat","nummer")).toEqual([1]);
		expect(easyStore.findSubjects("hat", null)).toEqual(["thun"]);
		expect(easyStore.findSubjects("nummer", 1).length).toBe(1);
		//TODO set objectvalue

		//easyStore.logData()
	});

	it("lets you observe values", function() {
		easyStore = new EasyStore();
		var observer = new (function(){
			this.subject, this.type, this.value;
			this.observedValueChanged = function(subject, type, value) {
				this.subject = subject;
				this.type = type;
				this.value = value;
			}
		});
		expect(observer.subject).toBeUndefined();
		expect(observer.predicate).toBeUndefined();
		expect(observer.value).toBeUndefined();
		easyStore.setValue("musik", "ist", "scheisse");
		easyStore.setValue("note", "pitch", 61);
		easyStore.addTriple("note", TYPE, "event");
		easyStore.addValueObserver("note", "pitch", observer);
		easyStore.addValueObserver("musik", "ist", observer);
		expect(easyStore.getValueObservers(null, null).length).toBe(2);
		expect(easyStore.getValueObservers(null, null)).toEqual([observer, observer]);
		expect(easyStore.getValueObservers("musik", null).length).toBe(1);
		expect(easyStore.getValueObservers("musik", null)).toEqual([observer]);
		expect(observer.subject).toBeUndefined();
		expect(observer.type).toBeUndefined();
		expect(observer.value).toBeUndefined();
		easyStore.setValue("musik", "ist", "laut");
		expect(observer.subject).toBe("musik");
		expect(observer.type).toBeUndefined();
		expect(observer.value).toBe("laut");
		easyStore.setValue("note", "pitch", 63);
		easyStore.setValue("note", "loudness", 127);
		expect(observer.subject).toBe("note");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(63);
		easyStore.removeValueObserver("note", "pitch", observer);
		easyStore.setValue("note", "pitch", 58);
		expect(observer.subject).toBe("note");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(63);
		expect(easyStore.getValueObservers(null, null).length).toBe(1);
		expect(easyStore.getValueObservers(null, null)).toEqual([observer]);
		expect(easyStore.getValueObservers("note", null).length).toBe(0);
		expect(easyStore.getValueObservers("note", null)).toEqual([]);
		//test adding type observers
		easyStore.setValue("note2", "pitch", 61);
		easyStore.addTriple("note2", TYPE, "event");
		easyStore.setValue("note3", "pitch", 65);
		easyStore.addTriple("note3", TYPE, "event");
		easyStore.addTypeObserver("event", "pitch", observer);
		expect(easyStore.getTypeObservers(null).length).toBe(1);
		expect(easyStore.getTypeObservers(null)).toEqual([observer]);
		easyStore.setValue("note3", "pitch", 66);
		expect(observer.subject).toBe("note3");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(66);
		easyStore.addTriple("note4", TYPE, "event");
		easyStore.setValue("note4", "pitch", 62);
		expect(observer.subject).toBe("note4");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(62);
		easyStore.removeTypeObserver("event", "pitch", null);
		expect(easyStore.getTypeObservers(null).length).toBe(1);
		easyStore.removeTypeObserver("event", "pitch", observer);
		expect(easyStore.getTypeObservers(null).length).toBe(0);
	});

	it("can do lots of things with lists", function() {
		easyStore = new EasyStore();
		//no triples in store
		expect(easyStore.size()).toBe(0);
		//add an element, which automatically initializes a list
		easyStore.addObjectToList("host", "list", "first");
		expect(easyStore.size()).toBe(3);
		var listUri = easyStore.findObject("host", "list");
		expect(listUri).not.toBeUndefined();
		expect(easyStore.findObject(listUri, FIRST)).toBe("first");
		expect(easyStore.findObject(listUri, REST)).toBe(NIL);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["first"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectIndexInList("host", "list", "first")).toBe(0);

		//add another element
		easyStore.addObjectToList("host", "list", "second");
		expect(easyStore.size()).toBe(5);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["first", "second"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBeUndefined();
		expect(easyStore.findObjectIndexInList("host", "list", "second")).toBe(1);

		//add some more
		easyStore.addObjectsToList("host", "list", ["third", "fourth", "fifth"]);
		expect(easyStore.size()).toBe(11);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["first", "second", "third", "fourth", "fifth"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("third");
		expect(easyStore.findObjectInListAt("host", "list", 3)).toBe("fourth");
		expect(easyStore.findObjectInListAt("host", "list", 4)).toBe("fifth");
		expect(easyStore.findObjectIndexInList("host", "list", "fourth")).toBe(3);

		//replace some
		easyStore.replaceObjectInList("host", "list", "première", 0);
		easyStore.replaceObjectInList("host", "list", "troisième", 2);
		expect(easyStore.size()).toBe(11);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["première", "second", "troisième", "fourth", "fifth"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("première");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("troisième");
		expect(easyStore.findObjectInListAt("host", "list", 3)).toBe("fourth");
		expect(easyStore.findObjectInListAt("host", "list", 4)).toBe("fifth");
		expect(easyStore.findObjectIndexInList("host", "list", "third")).toBe(-1);
		expect(easyStore.findObjectIndexInList("host", "list", "fifth")).toBe(4);

		//remove some
		easyStore.removeObjectFromList("host", "list", 1);
		easyStore.removeObjectFromList("host", "list", 3);
		expect(easyStore.size()).toBe(7);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["première", "troisième", "fourth"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("première");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("troisième");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("fourth");
		expect(easyStore.findObjectIndexInList("host", "list", "fifth")).toBe(-1);
		expect(easyStore.findObjectIndexInList("host", "list", "fourth")).toBe(2);

		//check some more functions
		easyStore.addObjectToList("host2", "list", "troisième");
		expect(easyStore.findContainingLists("troisième", "list")).toEqual(["host", "host2"]);

		//then delete the entire list
		easyStore.deleteList("host", "list");
		expect(easyStore.size()).toBe(3);
		easyStore.deleteList("host2", "list");
		expect(easyStore.size()).toBe(0);
	});

	it("can find subclasses and subtypes", function(done) {
		let dymoStore = new DymoStore();
		dymoStore.loadOntologies(SERVER_ROOT+'ontologies/')
			.then(() => {
				expect(dymoStore.isSubclassOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(false);
				expect(dymoStore.isSubclassOf(ACCELEROMETER_X, SENSOR_CONTROL)).toBe(true);
				expect(dymoStore.isSubclassOf(ACCELEROMETER_X, MOBILE_CONTROL)).toBe(true);
				expect(dymoStore.isSubclassOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(false);
				expect(dymoStore.isSubclassOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(true);
				expect(dymoStore.isSubclassOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
				expect(dymoStore.recursiveFindAllSubClasses(MOBILE_CONTROL).length).toBe(22);

				expect(dymoStore.isSubtypeOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(true);
				expect(dymoStore.isSubtypeOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(true);
				expect(dymoStore.isSubtypeOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(false);
				expect(dymoStore.isSubtypeOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
				done();
			});
	});

	it("can delete structures", function(done) {
		easyStore = new EasyStore();
		easyStore.setValue("musik", "ist", "scheisse");
		easyStore.setValue("note", "pitch", 61);
		easyStore.addTriple("note", TYPE, "event");
		easyStore.setValue("note2", "pitch", 62);
		easyStore.addTriple("note2", TYPE, "event");
		easyStore.setValue("note3", "pitch", 65);
		easyStore.addTriple("note3", TYPE, "event");
		easyStore.setValue("note4", "pitch", 67);
		easyStore.addTriple("note4", TYPE, "event");
		expect(easyStore.size()).toBe(9);
		easyStore.recursiveDeleteAllTriples("note3");
		expect(easyStore.size()).toBe(7);
		easyStore.addTriple("set", "element", "note");
		easyStore.addTriple("set", "element", "note2");
		easyStore.addTriple("set", "element", "note4");
		expect(easyStore.size()).toBe(10);
		easyStore.recursiveDeleteAllTriples("note2");
		expect(easyStore.size()).toBe(7);//deletes note2 and ref to note2
		expect(easyStore.findAllObjects("set", "element")).toEqual(["note", "note4"]);
		easyStore.recursiveDeleteAllTriples("set");
		expect(easyStore.size()).toBe(1);
		done();
	});

});
