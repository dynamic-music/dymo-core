describe("a processor", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var basePath = '../example/';
	var sourcePath1 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var dymo1;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		dymo1 = new DynamicMusicObject("dymo1");
		dymo1.setBasePath(basePath);
		dymo1.setSourcePath(sourcePath1);
		scheduler.loadBuffers(dymo1);
	});
	
	it("can timestretch", function() {
		console.profile("processor")
		var buffer = scheduler.getBuffer(dymo1);
		var stretched = new AudioProcessor(audioContext).timeStretch(buffer, 1.25);
		expect(stretched.getChannelData(0).length/10).toBeCloseTo(Math.round(0.8*buffer.getChannelData(0).length)/10, 0);
		console.profileEnd("processor")
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