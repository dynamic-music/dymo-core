import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { CONJUNCTION, AMPLITUDE, LOOP, CDT, SEQUENCE, PLAY } from '../../src/globals/uris';
import { Scheduler } from '../../src/audio/scheduler';
import { DymoStore } from '../../src/io/dymostore';
import { AudioBank } from '../../src/audio/audio-bank';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a scheduler", function() {

	var basePath = SERVER_ROOT+'spec/files/';
	var sourcePath1 = 'sark1.m4a';
	var sourcePath2 = 'sark1.m4a';
	var sourcePath3 = 'sark1.m4a';
	var scheduler, store;

	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

	beforeAll(function(done) {
		GlobalVars.SCHEDULE_AHEAD_TIME = 0;
		initSpeaker();
		store = new DymoStore();
		scheduler = new Scheduler(AUDIO_CONTEXT, new AudioBank(AUDIO_CONTEXT), store);
		store.loadOntologies(SERVER_ROOT+'ontologies/')
		.then(() => {
			store.addDymo("dymo1", null, null, null, CONJUNCTION);
			store.addDymo("dymo2", "dymo1", null, sourcePath1);
			store.addDymo("dymo3", "dymo1", null, sourcePath2);
			store.setParameter("dymo1", AMPLITUDE, 1);
			store.setParameter("dymo2", AMPLITUDE, 1);
			store.setParameter("dymo3", AMPLITUDE, 1);
			store.addBasePath("dymo1", basePath);

			store.addDymo("dymo0", null, null, sourcePath3);
			store.setParameter("dymo0", AMPLITUDE, 0);
			store.setParameter("dymo0", LOOP, 0);
			store.addBasePath("dymo0", basePath);

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
			expect(store.getParameterObservers("dymo1", AMPLITUDE).length).toBe(1);
			expect(store.getParameterObservers("dymo2", AMPLITUDE).length).toBe(2);
			expect(store.getParameterObservers("dymo3", AMPLITUDE).length).toBe(2);
			scheduler.stop("dymo1");
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
				expect(store.getParameterObservers("dymo1", AMPLITUDE).length).toBe(0);
				expect(store.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
				expect(store.getParameterObservers("dymo3", AMPLITUDE).length).toBe(0);
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
		store.setTriple("dymo1", CDT, SEQUENCE);
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(store.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			done();
		}, 100);
	});

	it("reacts to updates", function(done) {
		store.setParameter("dymo2", AMPLITUDE, 0.4);
		expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
			store.setParameter("dymo2", AMPLITUDE, 0.7);
			expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.7, 7);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(store.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
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
			expect(store.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
			done();
		}, 100);
	});

	it("loops a dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		store.setParameter("dymo0", LOOP, 1);
		scheduler.play("dymo0");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo0"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			//console.log(dymo0.getParameter(LOOP).getObservers().map(function(s){return s.getDymo().getUri();}))
			expect(store.getParameterObservers("dymo0", LOOP).length).toBe(2); //nextSource is already observing..
			expect(store.getParameterObservers("dymo0", AMPLITUDE).length).toBe(2);
			store.setParameter("dymo2", LOOP, 0);
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
		store.setTriple("dymo1", CDT, CONJUNCTION);
		expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
		store.setParameter("dymo1", PLAY, 1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2", "dymo3"]);
			store.setParameter("dymo3", PLAY, 0);
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1", "dymo2"]);
				store.setParameter("dymo1", PLAY, 0);
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual([]);
					done();
				}, 100);
				done();
			}, 100);
		}, 100);
	});

});
