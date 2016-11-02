describe("an easystore", function() {

	var easyStore;

	it("can add, remove, and set triples, objects, and values", function() {
		easyStore = new EasyStore();
		//no triples in store
		expect(easyStore.find().length).toBe(0);
		//adding, setting, and removing should work
		easyStore.addTriple("musik", "ist", "scheisse");
		expect(easyStore.find().length).toBe(1);
		easyStore.addTriple("mokka", "lives", "on");
		expect(easyStore.find().length).toBe(2);
		easyStore.setTriple("mokka", "lives", "forever");
		expect(easyStore.find().length).toBe(2);
		expect(easyStore.findObject("mokka", "lives")).toBe("forever");
		easyStore.addTriple("nothing", "else", "matters");
		expect(easyStore.find().length).toBe(3);
		easyStore.removeTriple("nothing", "else");
		expect(easyStore.find().length).toBe(2);
		//incomplete manipulations shouldn't work
		easyStore.addTriple("nothing", "else");
		easyStore.addTriple("nothing");
		easyStore.removeTriple("nothing");
		expect(easyStore.find().length).toBe(2);
		//adding and setting values
		easyStore.setValue("mokka", "number", 1);
		expect(easyStore.findObjectValue("mokka", "number")).toBe(1);
		expect(easyStore.find().length).toBe(3);
		easyStore.setValue("mokka", "is", ["always", "number", 1, "and", 3.1415926]);
		expect(easyStore.find().length).toBe(14);
		expect(easyStore.findObjectValue("mokka", "is")).toEqual(["always", "number", 1, "and", 3.1415926]);
		easyStore.setValue("mokka", "is", ["always", "the", 1, "and", "only"]);
		expect(easyStore.find().length).toBe(24);
		expect(easyStore.findObjectValue("mokka", "is")).toEqual(["always", "the", 1, "and", "only"]);
		//adding and setting object values
		easyStore.setObjectValue("thun", "hat", "bar", "nummer", 1);
		easyStore.setObjectValue("thun", "hat", "fluss");
		easyStore.setObjectValue(null, null, "garden", "nummer", 1);
		expect(easyStore.findObjectValueOfType("thun", "hat", "bar", "nummer")).toEqual(1);
		expect(easyStore.findObjectValue(easyStore.findObjectOfType("thun", "hat", "bar"), "nummer")).toEqual(1);
		expect(easyStore.findSubject("ist", "scheisse")).toEqual("musik");
		expect(easyStore.findSubject("number", 1)).toEqual("mokka");
		easyStore.setValue("mokka", "number", "one");
		expect(easyStore.findSubject("number", "one")).toEqual("mokka");
		expect(easyStore.findAllObjects("thun", "hat").length).toBe(2);
		expect(easyStore.findAllObjectValues(null, "nummer")).toEqual([1, 1]);
		expect(easyStore.findAllObjects("mokka").length).toBe(7);
		expect(easyStore.findAllObjectValues("mokka").length).toBe(6);
		expect(easyStore.findAllObjectValues("mokka")).toEqual(["one", "always", "the", 1, "and", "only"]);
		expect(easyStore.findAllObjectValuesOfType("thun","hat","nummer")).toEqual([1]);
		expect(easyStore.findAllSubjects("hat")).toEqual(["thun"]);
		expect(easyStore.findAllSubjects("nummer", 1).length).toBe(2);
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
		expect(easyStore.getValueObservers().length).toBe(2);
		expect(easyStore.getValueObservers()).toEqual([observer, observer]);
		expect(easyStore.getValueObservers("musik").length).toBe(1);
		expect(easyStore.getValueObservers("musik")).toEqual([observer]);
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
		expect(easyStore.getValueObservers().length).toBe(1);
		expect(easyStore.getValueObservers()).toEqual([observer]);
		expect(easyStore.getValueObservers("note").length).toBe(0);
		expect(easyStore.getValueObservers("note")).toEqual([]);
		//test adding type observers
		easyStore.setValue("note2", "pitch", 61);
		easyStore.addTriple("note2", TYPE, "event");
		easyStore.setValue("note3", "pitch", 65);
		easyStore.addTriple("note3", TYPE, "event");
		easyStore.addTypeObserver("event", "pitch", observer);
		expect(easyStore.getTypeObservers().length).toBe(1);
		expect(easyStore.getTypeObservers()).toEqual([observer]);
		easyStore.setValue("note3", "pitch", 66);
		expect(observer.subject).toBe("note3");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(66);
		easyStore.addTriple("note4", TYPE, "event");
		easyStore.setValue("note4", "pitch", 62);
		expect(observer.subject).toBe("note4");
		expect(observer.type).toEqual("event");
		expect(observer.value).toBe(62);
		easyStore.removeTypeObserver("event", "pitch");
		expect(easyStore.getTypeObservers().length).toBe(1);
		easyStore.removeTypeObserver("event", "pitch", observer);
		expect(easyStore.getTypeObservers().length).toBe(0);
	});

	it("can do lots of things with lists", function() {
		easyStore = new EasyStore();
		//no triples in store
		expect(easyStore.find().length).toBe(0);
		//add an element, which automatically initializes a list
		easyStore.addObjectToList("host", "list", "first");
		expect(easyStore.find().length).toBe(3);
		var listUri = easyStore.findObject("host", "list");
		expect(listUri).not.toBeUndefined();
		expect(easyStore.findObject(listUri, FIRST)).toBe("first");
		expect(easyStore.findObject(listUri, REST)).toBe(NIL);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["first"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectIndexInList("host", "list", "first")).toBe(0);

		//add another element
		easyStore.addObjectToList("host", "list", "second");
		expect(easyStore.find().length).toBe(5);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["first", "second"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBeUndefined();
		expect(easyStore.findObjectIndexInList("host", "list", "second")).toBe(1);

		//add some more
		easyStore.addObjectsToList("host", "list", ["third", "fourth", "fifth"]);
		expect(easyStore.find().length).toBe(11);
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
		expect(easyStore.find().length).toBe(11);
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
		expect(easyStore.find().length).toBe(7);
		expect(easyStore.findObjectOrList("host", "list")).toEqual(["première", "troisième", "fourth"]);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("première");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("troisième");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("fourth");
		expect(easyStore.findObjectIndexInList("host", "list", "fifth")).toBe(-1);
		expect(easyStore.findObjectIndexInList("host", "list", "fourth")).toBe(2);

		//check some more functions
		easyStore.addObjectToList("host2", "list", "troisième");
		expect(easyStore.findContainingLists("troisième")[0]).toEqual(["host2", "host"]);
		expect(easyStore.findContainingLists("troisième")[1]).toEqual(["list", "list"]);

		//then delete the entire list
		easyStore.deleteList("host", "list");
		expect(easyStore.find().length).toBe(3);
		easyStore.deleteList("host2", "list");
		expect(easyStore.find().length).toBe(0);
	});

	it("can find subclasses", function(done) {
		easyStore = new DymoStore(function() {
			expect(easyStore.isSubclassOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(false);
			expect(easyStore.isSubclassOf(ACCELEROMETER_X, SENSOR_CONTROL)).toBe(true);
			expect(easyStore.isSubclassOf(ACCELEROMETER_X, MOBILE_CONTROL)).toBe(true);
			expect(easyStore.isSubclassOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(false);
			expect(easyStore.isSubclassOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(true);
			expect(easyStore.isSubclassOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
			expect(easyStore.recursiveFindAllSubClasses(MOBILE_CONTROL).length).toBe(21);
			done();
		});
	});

	it("can find subtypes", function(done) {
		easyStore = new DymoStore(function() {
			expect(easyStore.isSubtypeOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(true);
			expect(easyStore.isSubtypeOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(true);
			expect(easyStore.isSubtypeOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(false);
			expect(easyStore.isSubtypeOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
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
		expect(easyStore.find().length).toBe(9);
		easyStore.recursiveDeleteAllTriples("note3");
		expect(easyStore.find().length).toBe(7);
		easyStore.addTriple("set", "element", "note");
		easyStore.addTriple("set", "element", "note2");
		easyStore.addTriple("set", "element", "note4");
		expect(easyStore.find().length).toBe(10);
		easyStore.recursiveDeleteAllTriples("note2");
		expect(easyStore.find().length).toBe(7);//deletes note2 and ref to note2
		expect(easyStore.findAllObjects("set", "element")).toEqual(["note4", "note"]);
		easyStore.recursiveDeleteAllTriples("set");
		expect(easyStore.find().length).toBe(1);
		done();
	});

});
