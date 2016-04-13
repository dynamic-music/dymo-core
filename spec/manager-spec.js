describe("a manager", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var manager = new DymoManager(audioContext, 0.1, '../audio/impulse_rev.wav');
	var fadePosition = 0;
	var isPlaying = false;
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 6000;
	
	
	it("manages a dymo", function(done) {
		console.profile("dymo");
		manager.loadDymoAndRendering('files/mixdymo.json', 'mixdymo-rendering.json', function() {
			manager.loadDymoFromJson('files/dymo.json', function(loadedDymo) {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(loadedDymo, function() {
					manager.loadDymoFromJson('files/dymo.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						replace(loadedDymo, function() {
							manager.loadDymoFromJson('files/dymo.json', function(loadedDymo) {
								expect(manager.getTopDymo()).not.toBeUndefined();
								replace(loadedDymo, function() {
									setTimeout(function() {
										manager.stopPlaying();
										expect(manager.getTopDymo()).not.toBeUndefined();
										done();
										console.profileEnd();
									}, 100);
								});
							});
						});
					});
				});
			});
		});
	});
	
	it("can sync dymos", function(done) {
		manager.loadDymoAndRendering('files/mixdymo.json', 'mixdymo-rendering.json', function() {
			manager.loadDymoFromJson('files/dymo.json', function(loadedDymo) {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(loadedDymo, function() {
					manager.loadDymoFromJson('files/dymo.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						var parts = manager.getTopDymo().getParts();
						manager.syncNavigators(parts[fadePosition], parts[1-fadePosition]);
						setTimeout(function() {
							manager.stopPlaying();
							expect(manager.getTopDymo()).not.toBeUndefined();
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