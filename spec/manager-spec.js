describe("a manager", function() {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	var manager, fadePosition, isPlaying;
	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

	beforeEach(function(done) {
		manager = new DymoManager(audioContext, 0.1, '../audio/impulse_rev.wav', function() {
			fadePosition = 0;
			isPlaying = false;
			done();
		});
	});


	it("manages a dymo", function(done) {
		//console.profile("dymo");
		manager.loadDymoAndRendering('files/mixdymo.json', 'files/mixdymo-rendering.json', function() {
			expect(DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo0", CONTEXT_URI+"dymo00"]);
			manager.loadDymoFromJson('files/dymo2.json', function(loadedDymo) {
				replace(CONTEXT_URI+"dymo0", function() {
					expect(DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo0", CONTEXT_URI+"dymo0"]);
					manager.loadDymoFromJson('files/dymo4.json', function(loadedDymo) {
						replace(CONTEXT_URI+"dymo00", function() {
							expect(DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo00", CONTEXT_URI+"dymo0"]);
							manager.loadDymoFromJson('files/dymo4.json', function(loadedDymo) {
								replace(CONTEXT_URI+"dymo00", function() {
									expect(DYMO_STORE.findParts(manager.getTopDymo())).toEqual([CONTEXT_URI+"dymo00", CONTEXT_URI+"dymo00"]);
									setTimeout(function() {
										manager.stopPlaying();
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
	});

	it("can sync and update navigators", function(done) {
		manager.loadDymoAndRendering('files/mixdymo.json', 'files/mixdymo-rendering.json', function() {
			manager.loadDymoFromJson('files/dymo4.json', function(loadedDymo) {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(CONTEXT_URI+"dymo00", function() {
					manager.loadDymoFromJson('files/dymo2.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						var parts = DYMO_STORE.findParts(manager.getTopDymo());
						var pos = parts.map(function(p){return manager.getNavigatorPosition(p, 0);});
						expect(pos[0]).toEqual(pos[1]); //now no longer fails even though nothing changed? //TODO FAILS, IS IT TOO EARLY TO CHECK HERE?
						manager.updateNavigatorPosition(parts[0], 0, 2);
						expect(manager.getNavigatorPosition(parts[0], 0)).toEqual(2);
						manager.syncNavigators(parts[1], parts[0], 0);
						//manager.syncNavigators(parts[1-fadePosition], parts[fadePosition], 0);
						var pos = parts.map(function(p){return manager.getNavigatorPosition(p, 0);})
						expect(pos[0]).toEqual(pos[1]);
						setTimeout(function() {
							manager.stopPlaying();
							done();
						}, 100);
					});
				});
			});
		});
	});

	function replace(nextSongDymo, callback) {
		var currentSongDymo = DYMO_STORE.findPartAt(manager.getTopDymo(), fadePosition);
		fadePosition = 1-fadePosition;
		manager.replacePartOfTopDymo(fadePosition, nextSongDymo);
		//sync the loaded dymos to be in the same metrical position
		//manager.syncNavigators(currentSongDymo, nextSongDymo, 2);
		setTimeout(function() {
			if (!isPlaying) {
				manager.startPlaying();
				isPlaying = true;
			}
			manager.getUIControl(CONTEXT_URI+"transition").update();
			callback();
		}, 300);
	}

});
