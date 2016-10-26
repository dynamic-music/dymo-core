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
		expect(easyStore.findObjectValuesOfType("thun", "hat", "bar", "nummer")).toEqual(1);
		expect(easyStore.findObjectValue(easyStore.findObjectOfType("thun", "hat", "bar"), "nummer")).toEqual(1);
		expect(easyStore.findSubject("ist", "scheisse")).toEqual("musik");
		expect(easyStore.findSubject("number", 1)).toEqual("mokka");
		easyStore.setValue("mokka", "number", "one");
		expect(easyStore.findSubject("number", "one")).toEqual("mokka");
		//TODO set objectvalue

		//easyStore.logData()
	});

	it("lets you observe values", function() {
		easyStore = new EasyStore();

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
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		//TODO USE MORE LIST FUNCTIONS TO FIND!!!

		//add another element
		easyStore.addObjectToList("host", "list", "second");
		expect(easyStore.find().length).toBe(5);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBeUndefined();

		//add some more
		easyStore.addObjectsToList("host", "list", ["third","fourth","fifth"]);
		expect(easyStore.find().length).toBe(11);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("first");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("third");
		expect(easyStore.findObjectInListAt("host", "list", 3)).toBe("fourth");
		expect(easyStore.findObjectInListAt("host", "list", 4)).toBe("fifth");

		//replace some
		easyStore.replaceObjectInList("host", "list", "première", 0);
		easyStore.replaceObjectInList("host", "list", "troisième", 2);
		expect(easyStore.find().length).toBe(11);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("première");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("second");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("troisième");
		expect(easyStore.findObjectInListAt("host", "list", 3)).toBe("fourth");
		expect(easyStore.findObjectInListAt("host", "list", 4)).toBe("fifth");

		//remove some
		easyStore.removeObjectFromList("host", "list", 1);
		easyStore.removeObjectFromList("host", "list", 3);
		expect(easyStore.find().length).toBe(7);
		expect(easyStore.findObjectInListAt("host", "list", 0)).toBe("première");
		expect(easyStore.findObjectInListAt("host", "list", 1)).toBe("troisième");
		expect(easyStore.findObjectInListAt("host", "list", 2)).toBe("fourth");

		//then delete the entire list
		easyStore.deleteList("host", "list");
		//easyStore.logData()
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

});
