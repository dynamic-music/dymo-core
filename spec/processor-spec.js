describe("a processor", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var sourcePath1 = '../example/sark1.m4a';
	var dymo1;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		dymo1 = new DynamicMusicObject("dymo1", scheduler);
		dymo1.setSourcePath(sourcePath1);
	});
	
	it("can timestretch", function(done) {
		dymo1.getParameter(TIME_STRETCH_RATIO).relativeUpdate(0.5);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo1"]);
			expect(audioContext.activeSourceCount).toBe(0);
			scheduler.stop(dymo1);
			done();
		}, 100);
	});
	
});