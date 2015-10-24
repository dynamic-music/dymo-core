describe("a dymoloader", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var scheduler, dymo, dymoMap, rendering;
	var dymoPath = '../example/dymo.json';
	var renderingPath = '../example/rendering.json';
	var reverbPath = '../example/impulse_rev.wav';
	
	it("loads a dymo from json", function(done) {
		scheduler = new Scheduler(audioContext, function(num) {
			scheduler.play(dymo);
			setTimeout(function() {
				//expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
				scheduler.stop(dymo);
				done();
			}, 2000);
		});
		scheduler.setReverbFile(reverbPath);
		var loader = new DymoLoader(scheduler);
		loader.loadDymoFromJson(dymoPath, function(loadedDymo) {
			dymo = loadedDymo[0];
			dymoMap = loadedDymo[1];
			expect(dymo.getUri()).toEqual("dymo0");
			expect(dymo.getParts().length).toBe(330);
			expect(Object.keys(dymoMap).length).toBe(331);
		});
	});
	
	it("loads a rendering from json", function(done) {
		var loader = new DymoLoader(scheduler);
		loader.loadRenderingFromJson(renderingPath, dymoMap, function(loadedRendering) {
			rendering = loadedRendering;
			expect(rendering.getMappings().length).toEqual(3);
			scheduler.play(dymo);
			setTimeout(function() {
				//expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
				scheduler.stop(dymo);
				done();
			}, 2000);
		});
	});
	
});