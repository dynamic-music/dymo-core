describe("a scheduler", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var sourcePath = '../example/sark1.m4a';
	var dymo1 = new DynamicMusicObject("dymo1");
	var dymo2 = new DynamicMusicObject("dymo2");
	dymo1.setSourcePath(sourcePath);
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		scheduler.addSourceFile(sourcePath);
	});
	
	it("plays a dymo", function(done) {
		expect(scheduler.urisOfPlayingDmos).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
			done();
		}, 1000);
	});
	
	it("stops a dymo", function(done) {
		expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDmos).toEqual([]);
			done();
		}, 500);
	});
	
});