describe("a processor", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var basePath = '../example/';
	var sourcePath1 = "sark1.m4a";
	var dymo1;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		scheduler.setDymoBasePath('../example/');
		dymo1 = new DynamicMusicObject("dymo1", scheduler);
		dymo1.setSourcePath(sourcePath1);
	});
	
	it("can timestretch", function() {
		var buffer = scheduler.getBuffer(dymo1);
		var stretched = new AudioProcessor(audioContext).timeStretch(buffer, 1.25);
		expect(stretched.getChannelData(0).length/10).toBeCloseTo(Math.round(0.8*buffer.getChannelData(0).length)/10, 0);
	});
	
	it("can timestretch dymos", function(done) {
		dymo1.getParameter(TIME_STRETCH_RATIO).relativeUpdate(-0.5);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo1"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			scheduler.stop(dymo1);
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