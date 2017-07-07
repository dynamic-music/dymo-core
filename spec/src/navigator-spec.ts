import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { CDT, CONJUNCTION, DISJUNCTION, SEQUENCE, LEVEL_FEATURE, FEATURE_TYPE, SIMILARITY_NAVIGATOR,
	LEAPING_PROBABILITY, CONTINUE_AFTER_LEAPING } from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { DymoManager } from '../../src/manager';
import { DymoNavigator } from '../../src/navigators/navigator';
import { DymoFunction } from '../../src/model/function';
import { SequentialNavigator } from '../../src/navigators/sequential';
import { SimilarityNavigator } from '../../src/navigators/similarity';
import { GraphNavigator } from '../../src/navigators/graph';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a navigator", function() {

	beforeEach(function(done) {
		initSpeaker();
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo2", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo3", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo4", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo5", "dymo2");
			GlobalVars.DYMO_STORE.addDymo("dymo6", "dymo2");
			GlobalVars.DYMO_STORE.addDymo("dymo7", "dymo3");
			GlobalVars.DYMO_STORE.addDymo("dymo8", "dymo3");
			GlobalVars.DYMO_STORE.addDymo("dymo9", "dymo3");
			GlobalVars.DYMO_STORE.addDymo("dymo10", "dymo4");
			GlobalVars.DYMO_STORE.addDymo("dymo11", "dymo8");
			GlobalVars.DYMO_STORE.addDymo("dymo12", "dymo8");
			GlobalVars.DYMO_STORE.addSimilar("dymo5", "dymo7");
			GlobalVars.DYMO_STORE.addSimilar("dymo7", "dymo5");
			GlobalVars.DYMO_STORE.addSimilar("dymo6", "dymo9");
			GlobalVars.DYMO_STORE.addSimilar("dymo8", "dymo10");
			GlobalVars.DYMO_STORE.addSimilar("dymo10", "dymo6");
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
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
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
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		GlobalVars.DYMO_STORE.setTriple("dymo2", CDT, CONJUNCTION);
		GlobalVars.DYMO_STORE.setTriple("dymo8", CDT, CONJUNCTION);
		expect(navigator.getNextParts()).toEqual(["dymo5","dymo6"]);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()).toEqual(["dymo11","dymo12"]);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		expect(navigator.getNextParts()).toEqual(["dymo5","dymo6"]);
	});

	it("can handle disjunctions", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		GlobalVars.DYMO_STORE.setTriple("dymo2", CDT, DISJUNCTION);
		GlobalVars.DYMO_STORE.setTriple("dymo8", CDT, DISJUNCTION);
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
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("meal", null, null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("dish", "meal", null, null, SEQUENCE);
			GlobalVars.DYMO_STORE.addDymo("noodles", "dish");
			GlobalVars.DYMO_STORE.addDymo("veggies", "dish");
			GlobalVars.DYMO_STORE.addDymo("pizza", "dish");
			GlobalVars.DYMO_STORE.addDymo("hotsauce", "meal");

			var navigator = new DymoNavigator("meal", new SequentialNavigator("meal"));
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
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("food");
			GlobalVars.DYMO_STORE.addDymo("meal", "food");
			GlobalVars.DYMO_STORE.addDymo("noodles", "meal");
			GlobalVars.DYMO_STORE.addDymo("veggies", "meal");
			GlobalVars.DYMO_STORE.addDymo("pizza", "meal");
			GlobalVars.DYMO_STORE.addPart("food", "meal");
			GlobalVars.DYMO_STORE.addPart("food", "meal");
			GlobalVars.DYMO_STORE.addDymo("canttakeitnomore", "food");

			var navigator = new DymoNavigator("food", new SequentialNavigator("food"));
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
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo2", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo3", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo4", "dymo2");
			GlobalVars.DYMO_STORE.addDymo("dymo4", "dymo3");

			var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			navigator.reset();
			GlobalVars.DYMO_STORE.addDymo("dymo5", "dymo2");
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);

			GlobalVars.DYMO_STORE.setTriple("dymo2", CDT, CONJUNCTION);
			GlobalVars.DYMO_STORE.setTriple("dymo3", CDT, CONJUNCTION);
			var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5"]);
			expect(navigator.getNextParts()).toEqual(["dymo4"]);

			GlobalVars.DYMO_STORE.addDymo("dymo0", null, "dymo1");
			GlobalVars.DYMO_STORE.addPart("dymo0", "dymo1");
			GlobalVars.DYMO_STORE.setTriple("dymo1", CDT, CONJUNCTION);
			var navigator = new DymoNavigator("dymo0", new SequentialNavigator("dymo1"));
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);
			expect(navigator.getNextParts()).toEqual(["dymo4", "dymo5", "dymo4"]);

			done();
		});
	});

	it("can navigate more larger typed structures", function(done) {
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("song");
			GlobalVars.DYMO_STORE.addDymo("verse1", "song", null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("verse2", "song", null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("accomp", "verse1", null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("solo1", "verse1", null, null, DISJUNCTION);
			GlobalVars.DYMO_STORE.addPart("verse2", "accomp");
			GlobalVars.DYMO_STORE.addDymo("solo2", "verse2", null, null, DISJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("bass", "accomp");
			GlobalVars.DYMO_STORE.addDymo("piano", "accomp");
			GlobalVars.DYMO_STORE.addDymo("sax1", "solo1");
			GlobalVars.DYMO_STORE.addDymo("sax2", "solo1");
			GlobalVars.DYMO_STORE.addDymo("sax3", "solo2");
			GlobalVars.DYMO_STORE.addDymo("sax4", "solo2");
			GlobalVars.DYMO_STORE.addDymo("sax5", "solo2");

			var navigator = new DymoNavigator("song", new SequentialNavigator("song"));
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
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("song");
			GlobalVars.DYMO_STORE.addDymo("verse1", "song", null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("verse2", "song", null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("accomp", "verse1");
			GlobalVars.DYMO_STORE.addDymo("solo1", "verse1");
			GlobalVars.DYMO_STORE.addPart("verse2", "accomp");
			GlobalVars.DYMO_STORE.addDymo("solo2", "verse2");
			GlobalVars.DYMO_STORE.addDymo("bass", "accomp");
			GlobalVars.DYMO_STORE.addDymo("piano", "accomp");
			GlobalVars.DYMO_STORE.addDymo("sax1", "solo1");
			GlobalVars.DYMO_STORE.addDymo("sax2", "solo1");
			GlobalVars.DYMO_STORE.addDymo("sax3", "solo2");
			GlobalVars.DYMO_STORE.addDymo("sax4", "solo2");
			GlobalVars.DYMO_STORE.addDymo("sax5", "solo2");

			var navigator = new DymoNavigator("song", new SequentialNavigator("song"));
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
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		navigator.addSubsetNavigator(new DymoFunction(["d"],[LEVEL_FEATURE],[FEATURE_TYPE], "return d == 1;", true), new SequentialNavigator("dymo1", true));
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
		var navigator = new DymoNavigator("dymo1");
		navigator.addSubsetNavigator(new DymoFunction(["d"],[LEVEL_FEATURE],[FEATURE_TYPE],"return d <= 1;", true), new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo8");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		//starts over
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		var navigator = new DymoNavigator("dymo1");
		navigator.addSubsetNavigator(new DymoFunction(["d"],[LEVEL_FEATURE],[FEATURE_TYPE],"return d == 0;", true), new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo2");
		expect(navigator.getNextParts()[0]).toBe("dymo3");
		expect(navigator.getNextParts()[0]).toBe("dymo4");
	});

	it("can also be based on similarity", function(done) {
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo2", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo3", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo4", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo5", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo6", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo7", "dymo1");
			GlobalVars.DYMO_STORE.addSimilar("dymo2", "dymo3");
			GlobalVars.DYMO_STORE.addSimilar("dymo3", "dymo2");
			GlobalVars.DYMO_STORE.addSimilar("dymo4", "dymo5");
			GlobalVars.DYMO_STORE.addSimilar("dymo4", "dymo6");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
			var simNav = new SimilarityNavigator("dymo1")
			navigator.addSubsetNavigator(new DymoFunction(["d"],[LEVEL_FEATURE],[FEATURE_TYPE],"return d == 0;", true), simNav);
			GlobalVars.DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 0);
			GlobalVars.DYMO_STORE.setParameter(null, CONTINUE_AFTER_LEAPING, 0);
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
			GlobalVars.DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 1);
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
			GlobalVars.DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 0.5);
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
			GlobalVars.DYMO_STORE.setParameter(null, CONTINUE_AFTER_LEAPING, 1);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can navigate directed graphs", function(done) {
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo2", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo3", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo4", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo5", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo6", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("dymo7", "dymo1");
			GlobalVars.DYMO_STORE.addSuccessor("dymo2", "dymo3");
			GlobalVars.DYMO_STORE.addSuccessor("dymo3", "dymo2");
			GlobalVars.DYMO_STORE.addSuccessor("dymo4", "dymo5");
			GlobalVars.DYMO_STORE.addSuccessor("dymo4", "dymo6");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
			var graphNav = new GraphNavigator("dymo1")
			navigator.addSubsetNavigator(new DymoFunction(["d"],[LEVEL_FEATURE],[FEATURE_TYPE],"return d == 0;", true), graphNav);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can be loaded from a rendering", function(done) {
		var manager = new DymoManager(AUDIO_CONTEXT, null, false, null);
		manager.init(SERVER_ROOT+'ontologies/').then(() => {
			manager.loadDymoAndRendering(SERVER_ROOT+'spec/files/similarity-dymo.json', SERVER_ROOT+'spec/files/similarity-rendering.json')
			.then(() => {
				var dymoUri = manager.getTopDymo();
				expect(GlobalVars.DYMO_STORE.findParts(dymoUri).length).toBe(5);
				expect(GlobalVars.DYMO_STORE.findSimilars(GlobalVars.DYMO_STORE.findParts(dymoUri)[1]).length).toBe(1);
				var navigators = manager.getRendering().getNavigator().getSubsetNavigators();
				expect(navigators.length).toBe(1);
				//expect(navigators[0][0]).toEqual(REPEATED_NAVIGATOR);
				expect(navigators[0][1].getType()).toEqual(SIMILARITY_NAVIGATOR);
				manager.startPlaying();
				setTimeout(function() {
					manager.stopPlaying();
					done();
				}, 50);
			});
		});
	});

});
