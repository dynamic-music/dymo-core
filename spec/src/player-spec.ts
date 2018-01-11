import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import * as uris from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { DymoManager } from '../../src/manager';
//import { DymoNavigator } from '../../src/navigators/navigator';
import { SequentialNavigator } from '../../src/navigators/sequential';
import { SimilarityNavigator } from '../../src/navigators/similarity';
import { GraphNavigator } from '../../src/navigators/graph';
import { ExpressionVariable } from '../../src/model/variable';
import { ConstraintWriter } from '../../src/io/constraintwriter';
import { Expression } from '../../src/model/expression';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';
import { DymoPlayer } from '../../src/audio/player';
import { Schedulo } from 'schedulo';

describe("a player", function() {

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
			store.setParameter("dymo2", uris.REPEAT, 2);
			store.setTriple("dymo2", uris.TYPE, uris.CONJUNCTION);
			done();
		});
	});

	afterEach(function() {
		endSpeaker();
	});

	it("should play", function() {
		let player = new DymoPlayer("dymo1", null, store, null);
		player.play()
			.then(p => console.log("done"));

		/*var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
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
		expect(navigator.getNextParts()[0]).toBe("dymo10");*/
	});

});
