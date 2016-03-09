describe("a manager", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var manager = new DymoManager(audioContext, 0.1, '../audio/impulse_rev.wav');
	var fadePosition = 0;
	var isPlaying = false;
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
	
	
	/*it("manages a dymo", function(done) {
		console.profile("dymo");
		manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
			expect(manager.getTopDymo()).not.toBeUndefined();
			console.profileEnd();
			done();
		});
	});*/
	
	it("manages a dymo", function(done) {
		console.profile("dymo");
		manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
			manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
				expect(manager.getTopDymo()).not.toBeUndefined();
				replace(loadedDymo, function() {
					manager.loadDymoFromJson('../example/dyymo.json', function(loadedDymo) {
						expect(manager.getTopDymo()).not.toBeUndefined();
						replace(loadedDymo, function() {
							manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
								expect(manager.getTopDymo()).not.toBeUndefined();
								replace(loadedDymo, function() {
									manager.loadDymoFromJson('../example/dyymo.json', function(loadedDymo) {
										expect(manager.getTopDymo()).not.toBeUndefined();
										replace(loadedDymo, function() {
											manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
												expect(manager.getTopDymo()).not.toBeUndefined();
												replace(loadedDymo, function() {
													manager.loadDymoFromJson('../example/dyymo.json', function(loadedDymo) {
														expect(manager.getTopDymo()).not.toBeUndefined();
														replace(loadedDymo, function() {
															manager.loadDymoFromJson('../example/dyymo.json', function(loadedDymo) {
																expect(manager.getTopDymo()).not.toBeUndefined();
																replace(loadedDymo, function() {
																	setTimeout(function() {
																		expect(manager.getTopDymo()).not.toBeUndefined();
																		done();
																		console.profileEnd();
																	}, 5000);
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
	
	function replace(nextSongDymo, callback) {
		var currentSongDymo = manager.getTopDymo().getPart(fadePosition);
		fadePosition = 1-fadePosition;
		manager.getTopDymo().replacePart(fadePosition, nextSongDymo);
		//sync the loaded dymos to be in the same metrical position
		var currentBeat = 0;
		if (currentSongDymo) {
			var currentBar = currentSongDymo.getPart(currentSongDymo.getNavigator().getPartsPlayed());
			currentBeat = currentBar.getNavigator().getPartsPlayed();
		}
		nextSongDymo.getPart(0).getNavigator().setPartsPlayed(currentBeat+1);
		setTimeout(function() {
			if (!isPlaying) {
				manager.startPlaying();
				isPlaying = true;
			}
			manager.getUIControl("transition").update();
			callback();
		}, 500);
	}
	
	/*it("manages a dymo", function(done) {
		//TODO TEST EVERYTHING IN MOODPLAY: PLAYBACK, TRANSFORMATION ETC (SOMEWHERE DYMOS ARE RETAINED2)
		manager = new manager(audioContext, 0.1, '../audio/impulse_rev.wav');
		manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
			var temp1 = manager.getTopDymo();
			expect(manager.getTopDymo()).not.toBeUndefined();
			manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
				var temp2 = manager.getTopDymo();
				expect(manager.getTopDymo()).not.toBeUndefined();
				manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
					var temp3 = manager.getTopDymo();
					expect(manager.getTopDymo()).not.toBeUndefined();
					done();
				});
			});
		});
	});*/
	
	/*it("manages a dymo", function(done) {
		manager = new manager(audioContext, 0.1, '../audio/impulse_rev.wav');
		manager.loadDymoAndRendering('../example/mixdymo.json', 'mixdymo-rendering.json', function() {
			expect(manager.getTopDymo()).not.toBeUndefined();
				manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
					expect(manager.getTopDymo()).not.toBeUndefined();
					manager.getTopDymo().replacePart(0, loadedDymo);
					manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
						manager.startPlaying();
						expect(manager.getTopDymo()).not.toBeUndefined();
						manager.getTopDymo().replacePart(1, loadedDymo);
						manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
							expect(manager.getTopDymo()).not.toBeUndefined();
							manager.getTopDymo().replacePart(0, loadedDymo);
							manager.getUIControl("transition").update();
							manager.loadDymoFromJson('../example/dymo.json', function(loadedDymo) {
								expect(manager.getTopDymo()).not.toBeUndefined();
								manager.getTopDymo().replacePart(1, loadedDymo);
								setTimeout(function() {
									expect(manager.getTopDymo()).not.toBeUndefined();
									manager.stopPlaying();
									manager = null;
									done();
								}, 10);
							});
						});
					});
				});
		});
	});*/
	
});