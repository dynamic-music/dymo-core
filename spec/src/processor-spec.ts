import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { DymoStore } from '../../src/io/dymostore';
import { AudioBank } from '../../src/audio/audio-bank';
import { Scheduler } from '../../src/audio/scheduler';
import { AudioProcessor } from '../../src/audio/processor';
import { TIME_STRETCH_RATIO } from '../../src/globals/uris';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a processor", function() {

	var store: DymoStore;
	var basePath = SERVER_ROOT+'spec/files/';
	var sourcePath1 = 'sark1.m4a'//'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var scheduler;

	beforeAll(function(done) {
		initSpeaker();
		store = new DymoStore();
		scheduler = new Scheduler(AUDIO_CONTEXT, new AudioBank(AUDIO_CONTEXT), store);
		store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			store.addDymo("dymo1", null, null, sourcePath1);
			store.addBasePath("dymo1", basePath);
			store.setParameter("dymo1", TIME_STRETCH_RATIO, 1);
			scheduler.init(null, ["dymo1"])
				.then(() => done());
		});
	});

	afterAll(function() {
		endSpeaker();
	});

	it("can timestretch", function() {
		//console.profile("processor")
		var buffer = scheduler.getBuffer("dymo1");
		var stretched = new AudioProcessor(AUDIO_CONTEXT).timeStretch(buffer, 1.25);
		expect(stretched.getChannelData(0).length/10).toBeCloseTo(Math.round(0.8*buffer.getChannelData(0).length)/10, 0);
		//console.profileEnd("processor")
	});

	it("can timestretch dymos", function(done) {
		store.setParameter("dymo1", TIME_STRETCH_RATIO, 2);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos().getValue()).toEqual(["dymo1"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			scheduler.stop("dymo1");
			done();
		}, 200);
	});

	/*it("can timestretch live", function(done) {
		dymo1.getParameter(TIME_STRETCH_RATIO).relativeUpdate(-0.5);
		dymo1.getParameter(PLAYBACK_RATE).relativeUpdate(0.5);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo1"]);
			expect(audioContext.activeSourceCount).toBe(0);
			scheduler.stop(dymo1);
			done();
		}, 100);
	});*/

});
