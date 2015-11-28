describe("a scheduler", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var sourcePath1 = '../example/sark1.m4a';
	var sourcePath2 = '../example/sark2.m4a';
	var dymo1, dymo2, dymo3;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		dymo1 = new DynamicMusicObject("dymo1", scheduler, PARALLEL);
		dymo2 = new DynamicMusicObject("dymo2", scheduler);
		dymo3 = new DynamicMusicObject("dymo3", scheduler);
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo2.setSourcePath(sourcePath1);
		dymo3.setSourcePath(sourcePath2);
	});
	
	it("plays a parallel dymo", function(done) {
		expect(scheduler.urisOfPlayingDmos).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual(["dymo2", "dymo1", "dymo3"]);
			done();
		}, 100);
	});
	
	it("stops a parallel dymo", function(done) {
		expect(scheduler.urisOfPlayingDmos).toEqual(["dymo2", "dymo1", "dymo3"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual([]);
			done();
		}, 100);
	});
	
	it("plays a sequential dymo", function(done) {
		dymo1.setType(SEQUENTIAL);
		expect(scheduler.urisOfPlayingDmos).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual(["dymo2", "dymo1"]);
			done();
		}, 100);
	});
	
	it("reacts to updates", function(done) {
		dymo2.getParameter(AMPLITUDE).relativeUpdate(undefined, -0.6);
		expect(scheduler.getSources(dymo2)[0].getParameter(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual(["dymo2", "dymo1"]);
			dymo2.getParameter(AMPLITUDE).relativeUpdate(undefined, 0.3);
			expect(scheduler.getSources(dymo2)[0].getParameter(AMPLITUDE)).toBeCloseTo(0.7, 7);
			setTimeout(function() {
				done();
			}, 100);
		}, 100);
	});
	
	it("stops a dymo", function(done) {
		expect(scheduler.urisOfPlayingDmos).toEqual(["dymo2", "dymo1"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual([]);
			done();
		}, 100);
	});
	
});