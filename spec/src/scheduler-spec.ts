import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { CONJUNCTION, AMPLITUDE, LOOP, CDT, SEQUENCE, PLAY } from '../../src/globals/uris';
import { Scheduler } from '../../src/audio/scheduler';
import { DymoStore } from '../../src/io/dymostore';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a scheduler", function() {

	//window.AudioContext = window.AudioContext || window.webkitAudioContext;
	//var audioContext = new AudioContext();

	var basePath = SERVER_ROOT+'spec/files/';
	var sourcePath1 = 'sark1.m4a';
	var sourcePath2 = 'sark2.m4a';
	var sourcePath3 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var scheduler;

	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

	beforeAll(function(done) {
		initSpeaker();
		scheduler = new Scheduler(AUDIO_CONTEXT);
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/')
		.then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1", null, null, null, CONJUNCTION);
			GlobalVars.DYMO_STORE.addDymo("dymo2", "dymo1", null, sourcePath1);
			GlobalVars.DYMO_STORE.addDymo("dymo3", "dymo1", null, sourcePath2);
			GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1);
			GlobalVars.DYMO_STORE.setParameter("dymo2", AMPLITUDE, 1);
			GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
			GlobalVars.DYMO_STORE.addBasePath("dymo1", basePath);

			GlobalVars.DYMO_STORE.addDymo("dymo0", null, null, sourcePath3);
			GlobalVars.DYMO_STORE.setParameter("dymo0", AMPLITUDE, 0);
			GlobalVars.DYMO_STORE.setParameter("dymo0", LOOP, 0);
			GlobalVars.DYMO_STORE.addBasePath("dymo0", basePath);

			scheduler.init(null, ["dymo0", "dymo1"])
				.then(() => done());
		});
	});

	afterAll(function() {
		endSpeaker();
	});

	it("plays and stops a parallel dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2", "dymo3"]);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo1", AMPLITUDE).length).toBe(1);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(2);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo3", AMPLITUDE).length).toBe(2);
			scheduler.stop("dymo1");
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
				expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo1", AMPLITUDE).length).toBe(0);
				expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
				expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo3", AMPLITUDE).length).toBe(0);
				done();
			}, 100);
		}, 100);
	});

	it("stops subdymos", function(done) {
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2", "dymo3"]);
			scheduler.stop("dymo2");
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo3"]);
				scheduler.stop("dymo1");
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});

	it("plays a sequential dymo", function(done) {
		GlobalVars.DYMO_STORE.setTriple("dymo1", CDT, SEQUENCE);
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			done();
		}, 100);
	});

	it("reacts to updates", function(done) {
		GlobalVars.DYMO_STORE.setParameter("dymo2", AMPLITUDE, 0.4);
		expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
			GlobalVars.DYMO_STORE.setParameter("dymo2", AMPLITUDE, 0.7);
			expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.7, 7);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			setTimeout(function() {
				done();
			}, 100);
		}, 100);
	});

	it("stops a dymo and cleans up the sources", function(done) {
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
		scheduler.stop("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
			done();
		}, 100);
	});

	it("loops a dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		GlobalVars.DYMO_STORE.setParameter("dymo0", LOOP, 1);
		scheduler.play("dymo0");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo0"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			//console.log(dymo0.getParameter(LOOP).getObservers().map(function(s){return s.getDymo().getUri();}))
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo0", LOOP).length).toBe(2); //nextSource is already observing..
			expect(GlobalVars.DYMO_STORE.getParameterObservers("dymo0", AMPLITUDE).length).toBe(2);
			GlobalVars.DYMO_STORE.setParameter("dymo2", LOOP, 0);
			setTimeout(function() {
				//not quite done playing yet
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo0"]);
				scheduler.stop("dymo0");
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});

	it("observes and reacts to the play parameter of all dymos", function(done) {
		GlobalVars.DYMO_STORE.setTriple("dymo1", CDT, CONJUNCTION);
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		GlobalVars.DYMO_STORE.setParameter("dymo1", PLAY, 1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2", "dymo3"]);
			GlobalVars.DYMO_STORE.setParameter("dymo3", PLAY, 0);
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
				GlobalVars.DYMO_STORE.setParameter("dymo1", PLAY, 0);
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
					done();
				}, 100);
				done();
			}, 100);
		}, 100);
	});

});
