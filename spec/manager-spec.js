describe("a manager", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var manager, fadePosition, isPlaying;
	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 6000;
	
	beforeEach(function() {
		manager = new DymoManager(audioContext, 0.1, '../audio/impulse_rev.wav');
		fadePosition = 0;
		isPlaying = false;
	});
	
	
	it("manages a dymo", function(done) {
		//console.profile("dymo");
		manager.loadDymoAndRendering('files/mixdymo.json', 'files/mixdymo-rendering.json', function() {
			manager.loadDymoFromJson('files/dymo4.json', function(loadedDymo) {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(loadedDymo, function() {
					manager.loadDymoFromJson('files/dymo2.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						replace(loadedDymo, function() {
							manager.loadDymoFromJson('files/dymo4.json', function(loadedDymo) {
								expect(manager.getTopDymo()).not.toBeUndefined();
								replace(loadedDymo, function() {
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
				replace(loadedDymo, function() {
					manager.loadDymoFromJson('files/dymo2.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						var parts = manager.getTopDymo().getParts();
						var pos = parts.map(function(p){return manager.getNavigatorPosition(p, 0);})
						expect(pos[0]).toEqual(1);
						expect(pos[0]).toEqual(pos[1]);
						manager.updateNavigatorPosition(parts[0], 0, 2);
						expect(manager.getNavigatorPosition(parts[0], 0)).toEqual(2);
						manager.syncNavigators(parts[1], parts[0], 0);
						//manager.syncNavigators(parts[1-fadePosition], parts[fadePosition], 0);
						var pos = parts.map(function(p){return manager.getNavigatorPosition(p, 0);})
						console.log(pos)
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
		var currentSongDymo = manager.getTopDymo().getPart(fadePosition);
		fadePosition = 1-fadePosition;
		manager.replacePartOfTopDymo(fadePosition, nextSongDymo);
		//sync the loaded dymos to be in the same metrical position
		//manager.syncNavigators(currentSongDymo, nextSongDymo, 2);
		setTimeout(function() {
			if (!isPlaying) {
				manager.startPlaying();
				isPlaying = true;
			}
			manager.getUIControl("transition").update();
			callback();
		}, 300);
	}
	
});