import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { CDT, CONJUNCTION, DISJUNCTION, SEQUENCE, LEVEL_FEATURE, FEATURE_TYPE, SIMILARITY_NAVIGATOR,
	LEAPING_PROBABILITY, CONTINUE_AFTER_LEAPING, DYMO } from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { DymoManager } from '../../src/manager';
import { DymoNavigator } from '../../src/navigators/navigator';
import { SequentialNavigator } from '../../src/navigators/sequential';
import { SimilarityNavigator } from '../../src/navigators/similarity';
import { GraphNavigator } from '../../src/navigators/graph';
import { ExpressionVariable } from '../../src/model/variable';
import { ConstraintWriter } from '../../src/io/constraintwriter';
import { Expression } from '../../src/model/expression';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a navigator", function() {

	let store;

	beforeEach(function(done) {
		GlobalVars.SCHEDULE_AHEAD_TIME = 0;
		initSpeaker();
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("dymo1");
			store.addDymo("dymo2", "dymo1");
			store.addDymo("dymo3", "dymo1");
			store.addDymo("dymo4", "dymo1");
			store.addDymo("dymo5", "dymo2");
			store.addDymo("dymo6", "dymo2");
			store.addDymo("dymo7", "dymo3");
			store.addDymo("dymo8", "dymo3");
			store.addDymo("dymo9", "dymo3");
			store.addDymo("dymo10", "dymo4");
			store.addDymo("dymo11", "dymo8");
			store.addDymo("dymo12", "dymo8");
			store.addSimilar("dymo5", "dymo7");
			store.addSimilar("dymo7", "dymo5");
			store.addSimilar("dymo6", "dymo9");
			store.addSimilar("dymo8", "dymo10");
			store.addSimilar("dymo10", "dymo6");
			//dymo2.addSimilar(dymo3);
			//dymo3.addSimilar(dymo2);
			//dymo4.addSimilar(dymo5);
			//dymo4.addSimilar(dymo6);
			done();
		});
	});

	afterEach(function() {
		endSpeaker();
	});

	it("is normally sequential", function() {
		var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
		expect(navigator.getPosition("dymo1")).toBeUndefined();
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getPosition("dymo1")).toBe(0);
		//expect(navigator.getPosition("dymo2")).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getPosition("dymo1")).toBe(1);
		//expect(navigator.getPosition("dymo2")).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getPosition("dymo1")).toBe(2);
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getPosition("dymo1")).toBe(0);
		//and keeps looping
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		navigator.reset();
		//starts over
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
	});

	/*it("has getters and setters for its position", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		expect(navigator.getPosition(0)).toBeUndefined();
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
		navigator.setPosition(1, 0);
		navigator.setPosition(1, 1);
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
	});*/

	it("can handle conjunctions", function() {
		var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
		store.setTriple("dymo2", CDT, CONJUNCTION);
		store.setTriple("dymo8", CDT, CONJUNCTION);
		expect(navigator.getNextParts()).toEqual(["dymo5","dymo6"]);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()).toEqual(["dymo11","dymo12"]);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		expect(navigator.getNextParts()).toEqual(["dymo5","dymo6"]);
	});

	it("can handle disjunctions", function() {
		var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
		store.setTriple("dymo2", CDT, DISJUNCTION);
		store.setTriple("dymo8", CDT, DISJUNCTION);
		var nextPart = navigator.getNextParts()[0];
		expect(nextPart == "dymo5" || nextPart == "dymo6").toBe(true);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		nextPart = navigator.getNextParts()[0];
		expect(nextPart == "dymo11" || nextPart == "dymo12").toBe(true);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		nextPart = navigator.getNextParts()[0];
		expect(nextPart == "dymo5" || nextPart == "dymo6").toBe(true);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
	});

	it("can handle conjunctions of sequences", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("meal", null, null, null, CONJUNCTION);
			store.addDymo("dish", "meal", null, null, SEQUENCE);
			store.addDymo("noodles", "dish");
			store.addDymo("veggies", "dish");
			store.addDymo("pizza", "dish");
			store.addDymo("hotsauce", "meal");

			var navigator = new DymoNavigator("meal", store, new SequentialNavigator("meal", store));
			expect(navigator.getNextParts()).toEqual(["noodles", "hotsauce"]);
			expect(navigator.getNextParts()).toEqual(["veggies", "hotsauce"]);
			expect(navigator.getNextParts()).toEqual(["pizza", "hotsauce"]);
			//starts over
			expect(navigator.getNextParts()).toEqual(["noodles", "hotsauce"]);
			expect(navigator.getNextParts()).toEqual(["veggies", "hotsauce"]);

			done();
		});
	});

	it("can handle a sequence of a sequence", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("food");
			store.addDymo("meal", "food");
			store.addDymo("noodles", "meal");
			store.addDymo("veggies", "meal");
			store.addDymo("pizza", "meal");
			store.addPart("food", "meal");
			store.addPart("food", "meal");
			store.addDymo("canttakeitnomore", "food");

			var navigator = new DymoNavigator("food", store, new SequentialNavigator("food", store));
			expect(navigator.getNextParts()).toEqual(["noodles"]);
			expect(navigator.getNextParts()).toEqual(["veggies"]);
			expect(navigator.getNextParts()).toEqual(["pizza"]);
			expect(navigator.getNextParts()).toEqual(["noodles"]);
			expect(navigator.getNextParts()).toEqual(["veggies"]);
			expect(navigator.getNextParts()).toEqual(["pizza"]);
			expect(navigator.getNextParts()).toEqual(["noodles"]);
			expect(navigator.getNextParts()).toEqual(["veggies"]);
			expect(navigator.getNextParts()).toEqual(["pizza"]);
			expect(navigator.getNextParts()).toEqual(["canttakeitnomore"]);
			//starts over
			expect(navigator.getNextParts()).toEqual(["noodles"]);
			expect(navigator.getNextParts()).toEqual(["veggies"]);

			done();
		});
	});

	it("can navigate larger typed structures", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("dymo1");
			store.addDymo("dymo2", "dymo1");
			store.addDymo("dymo3", "dymo1");
			store.addDymo("dymo4", "dymo2");
			store.addDymo("dymo4", "dymo3");

			var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			navigator.reset();
			store.addDymo("dymo5", "dymo2");
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);

			store.setTriple("dymo2", CDT, CONJUNCTION);
			store.setTriple("dymo3", CDT, CONJUNCTION);
			var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);

			store.addDymo("dymo0", null, "dymo1");
			store.addPart("dymo0", "dymo1");
			store.setTriple("dymo1", CDT, CONJUNCTION);
			var navigator = new DymoNavigator("dymo0", store, new SequentialNavigator("dymo1", store));
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);

			done();
		});
	});

	it("can navigate more larger typed structures", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("song");
			store.addDymo("verse1", "song", null, null, CONJUNCTION);
			store.addDymo("verse2", "song", null, null, CONJUNCTION);
			store.addDymo("accomp", "verse1", null, null, CONJUNCTION);
			store.addDymo("solo1", "verse1", null, null, DISJUNCTION);
			store.addPart("verse2", "accomp");
			store.addDymo("solo2", "verse2", null, null, DISJUNCTION);
			store.addDymo("bass", "accomp");
			store.addDymo("piano", "accomp");
			store.addDymo("sax1", "solo1");
			store.addDymo("sax2", "solo1");
			store.addDymo("sax3", "solo2");
			store.addDymo("sax4", "solo2");
			store.addDymo("sax5", "solo2");

			var navigator = new DymoNavigator("song", store, new SequentialNavigator("song", store));
			var nextParts = navigator.getNextParts();
			expect(nextParts.length).toBe(3);
			expect(nextParts).toContain("bass");
			expect(nextParts).toContain("piano");
			expect(nextParts.indexOf("sax1")+nextParts.indexOf("sax2")).toBeGreaterThan(-2);
			nextParts = navigator.getNextParts();
			expect(nextParts.length).toBe(3);
			expect(nextParts).toContain("bass");
			expect(nextParts).toContain("piano");
			expect(nextParts.indexOf("sax3")+nextParts.indexOf("sax4")+nextParts.indexOf("sax5")).toBeGreaterThan(-3);
			//starts over
			nextParts = navigator.getNextParts();
			expect(nextParts.length).toBe(3);
			expect(nextParts).toContain("bass");
			expect(nextParts).toContain("piano");
			expect(nextParts.indexOf("sax1")+nextParts.indexOf("sax2")).toBeGreaterThan(-2);

			done();
		});
	});

	it("can navigate even more larger typed structures", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("song");
			store.addDymo("verse1", "song", null, null, CONJUNCTION);
			store.addDymo("verse2", "song", null, null, CONJUNCTION);
			store.addDymo("accomp", "verse1");
			store.addDymo("solo1", "verse1");
			store.addPart("verse2", "accomp");
			store.addDymo("solo2", "verse2");
			store.addDymo("bass", "accomp");
			store.addDymo("piano", "accomp");
			store.addDymo("sax1", "solo1");
			store.addDymo("sax2", "solo1");
			store.addDymo("sax3", "solo2");
			store.addDymo("sax4", "solo2");
			store.addDymo("sax5", "solo2");

			var navigator = new DymoNavigator("song", store, new SequentialNavigator("song", store));
			expect(navigator.getNextParts()).toEqual(["bass","sax1"]);
			expect(navigator.getNextParts()).toEqual(["piano","sax2"]);
			expect(navigator.getNextParts()).toEqual(["bass","sax3"]);
			expect(navigator.getNextParts()).toEqual(["piano","sax4"]);
			expect(navigator.getNextParts()).toEqual(["bass","sax5"]);
			//starts over
			expect(navigator.getNextParts()).toEqual(["bass","sax1"]);
			expect(navigator.getNextParts()).toEqual(["piano","sax2"]);

			done();
		});
	});

	it("can have various subset navigators", function() {
		var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
		navigator.addSubsetNavigator(new ExpressionVariable("d", DYMO, new Expression("LevelFeature(d) == 1")), new SequentialNavigator("dymo1", store, true));
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo5");
	});

	it("can have missing subset navigators", function() {
		var navigator = new DymoNavigator("dymo1", store);
		navigator.addSubsetNavigator(new ExpressionVariable("d", DYMO, new Expression("LevelFeature(d) <= 1")), new SequentialNavigator("dymo1", store));
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo8");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		//no lower-level navs, simply returns first-level objects
		var navigator = new DymoNavigator("dymo1", store);
		navigator.addSubsetNavigator(new ExpressionVariable("d", DYMO, new Expression("LevelFeature(d) == 0")), new SequentialNavigator("dymo1", store));
		expect(navigator.getNextParts()[0]).toBe("dymo2");
		expect(navigator.getNextParts()[0]).toBe("dymo3");
		expect(navigator.getNextParts()[0]).toBe("dymo4");
	});

	it("can also be based on similarity", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("dymo1");
			store.addDymo("dymo2", "dymo1");
			store.addDymo("dymo3", "dymo1");
			store.addDymo("dymo4", "dymo1");
			store.addDymo("dymo5", "dymo1");
			store.addDymo("dymo6", "dymo1");
			store.addDymo("dymo7", "dymo1");
			store.addSimilar("dymo2", "dymo3");
			store.addSimilar("dymo3", "dymo2");
			store.addSimilar("dymo4", "dymo5");
			store.addSimilar("dymo4", "dymo6");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
			var simNav = new SimilarityNavigator("dymo1", store)
			navigator.addSubsetNavigator(new ExpressionVariable("d", DYMO, new Expression("LevelFeature(d) == 0")), simNav);
			store.setControlParam(null, LEAPING_PROBABILITY, 0);
			store.setControlParam(null, CONTINUE_AFTER_LEAPING, 0);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo4"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			//starts over
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);


			//test replacing of objects with similars (probability 1)
			navigator.reset();
			store.setControlParam(null, LEAPING_PROBABILITY, 1);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			//starts over
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);


			//test replacing of objects with similars (probability 0.5)
			navigator.reset();
			store.setControlParam(null, LEAPING_PROBABILITY, 0.5);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			//starts over
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);


			//test leaping and continuing
			navigator.reset();
			store.setControlParam(null, CONTINUE_AFTER_LEAPING, 1);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can navigate directed graphs", function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("dymo1");
			store.addDymo("dymo2", "dymo1");
			store.addDymo("dymo3", "dymo1");
			store.addDymo("dymo4", "dymo1");
			store.addDymo("dymo5", "dymo1");
			store.addDymo("dymo6", "dymo1");
			store.addDymo("dymo7", "dymo1");
			store.addSuccessor("dymo2", "dymo3");
			store.addSuccessor("dymo3", "dymo2");
			store.addSuccessor("dymo3", "dymo4");
			store.addSuccessor("dymo4", "dymo5");
			store.addSuccessor("dymo4", "dymo6");
			store.addSuccessor("dymo5", "dymo7");
			store.addSuccessor("dymo5", "dymo7");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
			var graphNav = new GraphNavigator("dymo1", store)
			navigator.addSubsetNavigator(new ExpressionVariable("d", DYMO, new Expression("LevelFeature(d) == 0")), graphNav);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can be loaded from a rendering", function(done) {
		var manager = new DymoManager(AUDIO_CONTEXT);
		manager.init(SERVER_ROOT+'ontologies/').then(() => {
			manager.loadDymoAndRendering(SERVER_ROOT+'spec/files/similarity-dymo.json', SERVER_ROOT+'spec/files/similarity-rendering.json')
			.then(() => {
				store = manager.getStore();
				var dymoUri = manager.getTopDymo();
				expect(store.findParts(dymoUri).length).toBe(5);
				expect(store.findSimilars(store.findParts(dymoUri)[1]).length).toBe(1);
				var navigators = manager.getRendering().getNavigator().getSubsetNavigators();
				expect(navigators.size).toBe(1);
				expect(navigators.values().next().value.getType()).toEqual(SIMILARITY_NAVIGATOR);
				manager.startPlaying();
				setTimeout(function() {
					manager.stopPlaying();
					done();
				}, 50);
			});
		});
	});

});
