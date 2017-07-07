import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { CONTEXT_URI } from '../../src/globals/uris';
import { DymoManager } from '../../src/manager';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';

describe("a manager", function() {

	var filesDir = SERVER_ROOT+'spec/files/';

	var manager: DymoManager, fadePosition: number, isPlaying: boolean;
	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

	beforeEach(function(done) {
		initSpeaker();
		manager = new DymoManager(AUDIO_CONTEXT, 0.1, false, SERVER_ROOT+'audio/impulse_rev.wav');
		manager.init(SERVER_ROOT+'ontologies/')
			.then(() => {
				fadePosition = 0;
				isPlaying = false;
				done();
			});
	});

	afterEach(function() {
		endSpeaker();
	});


	it("manages a dymo", function(done) {
		//console.profile("dymo");
		manager.loadDymoAndRendering(filesDir+'mixdymo.json', filesDir+'mixdymo-rendering.json')
			.then(() => {
				expect(GlobalVars.DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo0", CONTEXT_URI+"dymo00"]);
				return manager.loadDymoFromJson(filesDir+'dymo2.json')
			})
			.then(loadedDymo => {
				replace(CONTEXT_URI+"dymo0", () => {
					expect(GlobalVars.DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo0", CONTEXT_URI+"dymo0"]);
					manager.loadDymoFromJson(filesDir+'dymo4.json')
					.then(loadedDymo => {
						replace(CONTEXT_URI+"dymo00", () => {
							expect(GlobalVars.DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo00", CONTEXT_URI+"dymo0"]);
							manager.loadDymoFromJson(filesDir+'dymo4.json')
								.then(loadedDymo => {
									replace(CONTEXT_URI+"dymo00", () => {
										expect(GlobalVars.DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo00", CONTEXT_URI+"dymo00"]);
										setTimeout(() => {
											//manager.stopPlaying();
											expect(manager.getTopDymo()).not.toBeUndefined();
											done();
											//console.profileEnd();
										}, 100);
									});
								});
						});
					});
				});
			});
	});

	it("can sync and update navigators", function(done) {
		manager.loadDymoAndRendering(filesDir+'mixdymo.json', filesDir+'mixdymo-rendering.json')
			.then(() => manager.loadDymoFromJson(filesDir+'dymo4.json'))
			.then(loadedDymo => {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(CONTEXT_URI+"dymo00", () => {
					manager.loadDymoFromJson(filesDir+'dymo2.json')
					 	.then(loadedDymo => {
							expect(manager.getTopDymo()).not.toBeUndefined();
							var parts = GlobalVars.DYMO_STORE.findParts(manager.getTopDymo());
							var pos = parts.map(p => manager.getNavigatorPosition(p, 0));
							expect(pos[0]).toEqual(pos[1]); //now no longer fails even though nothing changed? //TODO FAILS, IS IT TOO EARLY TO CHECK HERE?
							manager.updateNavigatorPosition(parts[0], 0, 2);
							//expect(manager.getNavigatorPosition(parts[0], 0)).toEqual(2);
							manager.syncNavigators(parts[1], parts[0], 0);
							//manager.syncNavigators(parts[1-fadePosition], parts[fadePosition], 0);
							var pos = parts.map(p => manager.getNavigatorPosition(p, 0));
							expect(pos[0]).toEqual(pos[1]);
							setTimeout(() => {
								//manager.stopPlaying();
								done();
							}, 100);
						});
				});
			});
	});

	function replace(nextSongDymo, callback) {
		var currentSongDymo = GlobalVars.DYMO_STORE.findPartAt(manager.getTopDymo(), fadePosition);
		fadePosition = 1-fadePosition;
		manager.replacePartOfTopDymo(fadePosition, nextSongDymo);
		//sync the loaded dymos to be in the same metrical position
		//manager.syncNavigators(currentSongDymo, nextSongDymo, 2);
		setTimeout(() => {
			if (!isPlaying) {
				//manager.startPlaying();
				isPlaying = true;
			}
			manager.getUIControl(CONTEXT_URI+"transition").update();
			callback();
		}, 300);
	}

});
