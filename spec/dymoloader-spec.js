describe("a dymoloader", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var scheduler, dymo, dymoMap, rendering;
	var dymoPath = '../example/dymo.json';
	var featureRenderingPath = '../example/feature-rendering.json';
	var controlRenderingPath = '../example/control-rendering.json';
	var similarityGraphPath = '../example/similarity.json';
	var reverbPath = '../example/impulse_rev.wav';
	
	it("loads a dymo from json", function(done) {
		scheduler = new Scheduler(audioContext, function(num) {
			scheduler.play(dymo);
			setTimeout(function() {
				//expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
				scheduler.stop(dymo);
				done();
			}, 100);
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
	
	it("loads a feature rendering from json", function(done) {
		var loader = new DymoLoader(scheduler);
		loader.loadRenderingFromJson(featureRenderingPath, dymoMap, function(loadedRendering) {
			rendering = loadedRendering[0];
			controls = loadedRendering[1];
			expect(rendering.getMappings().length).toEqual(3);
			expect(Object.keys(controls).length).toEqual(0);
			rendering.play();
			setTimeout(function() {
				expect(scheduler.urisOfPlayingDmos).toEqual(["dymo4", "dymo0"]);
				rendering.stop();
				done();
			}, 100);
		});
	});
	
	it("loads a control rendering from json", function(done) {
		var loader = new DymoLoader(scheduler);
		loader.loadRenderingFromJson(controlRenderingPath, dymoMap, function(loadedRendering) {
			rendering = loadedRendering[0];
			controls = loadedRendering[1];
			expect(rendering.getMappings().length).toEqual(2);
			expect(Object.keys(controls).length).toEqual(1);
			done();
		});
	});
	
	it("loads a similarity graph from json", function(done) {
		var loader = new DymoLoader(scheduler);
		loader.loadGraphFromJson(similarityGraphPath, dymoMap, function() {
			var graph = dymo.toJsonSimilarityGraph();
			expect(graph["nodes"].length).toEqual(331);
			expect(graph["links"].length).toEqual(274);
			done();
		});
	});
	
});