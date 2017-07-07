import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { DymoStore } from '../../src/io/dymostore';
import { Scheduler } from '../../src/audio/scheduler';
import { AudioProcessor } from '../../src/audio/processor';
import { TIME_STRETCH_RATIO } from '../../src/globals/uris';
import { SERVER_ROOT, AUDIO_CONTEXT } from './server';

describe("a processor", function() {

	var basePath = SERVER_ROOT+'spec/files/';
	var sourcePath1 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var scheduler;

	beforeAll(function(done) {
		scheduler = new Scheduler(AUDIO_CONTEXT);
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1", null, null, sourcePath1);
			GlobalVars.DYMO_STORE.addBasePath("dymo1", basePath);
			GlobalVars.DYMO_STORE.setParameter("dymo1", TIME_STRETCH_RATIO, 1);
			scheduler.init(null, ["dymo1"])
				.then(() => done());
		});
	});

	it("can timestretch", function() {
		//console.profile("processor")
		var buffer = scheduler.getBuffer("dymo1");
		var stretched = new AudioProcessor(AUDIO_CONTEXT).timeStretch(buffer, 1.25);
		expect(stretched.getChannelData(0).length/10).toBeCloseTo(Math.round(0.8*buffer.getChannelData(0).length)/10, 0);
		//console.profileEnd("processor")
	});

	it("can timestretch dymos", function(done) {
		GlobalVars.DYMO_STORE.setParameter("dymo1", TIME_STRETCH_RATIO, 0.5);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			scheduler.stop("dymo1");
			done();
		}, 100);
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
