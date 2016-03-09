describe("a dymoloader", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var dymo, dymoMap, scheduler, rendering;
	var dymoPath = '../example/dymo.json';
	var dymo2Path = '../example/dymo2.json';
	var dymo3Path = '../example/dymo3.json';
	var featureRenderingPath = '../example/feature-rendering.json';
	var controlRenderingPath = '../example/control-rendering.json';
	var similarityGraphPath = '../example/similarity.json';
	var reverbPath = '../audio/impulse_rev.wav';
	
	it("loads a dymo from json", function(done) {
		scheduler = new Scheduler(audioContext, function(num) {
			scheduler.play(dymo);
			setTimeout(function() {
				//expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
				scheduler.stop(dymo);
				done();
			}, 300);
		});
		scheduler.setReverbFile(reverbPath);
		var loader = new DymoLoader(scheduler);
		loader.loadDymoFromJson(dymoPath, function(loadedDymo) {
			dymo = loadedDymo[0];
			dymoMap = loadedDymo[1];
			expect(dymo.getUri()).toEqual("dymo0");
			//test if initial parameter value loaded correctly
			expect(dymoMap["dymo4"].getParameter(AMPLITUDE).getValue()).toEqual(0.5);
			expect(dymoMap["dymo76"].getParameter(AMPLITUDE).getValue()).toEqual(1);
			expect(dymo.getParts().length).toBe(330);
			expect(Object.keys(dymoMap).length).toBe(331);
		});
	});
	
	it("loads higher-level parameters from json", function(done) {
		var loader = new DymoLoader(scheduler);
		loader.loadDymoFromJson(dymo2Path, function(loadedDymo) {
			var dymo2 = loadedDymo[0];
			var dymoMap2 = loadedDymo[1];
			expect(dymo2.getUri()).toEqual("dymo0");
			expect(dymo2.getParts().length).toBe(2);
			expect(Object.keys(dymoMap2).length).toBe(3);
			expect(dymo2.getParameter("fade")).not.toBeUndefined();
			expect(dymo2.getParameter("fade").getObservers().length).toBe(2);
			dymo2.getParameter("fade").update(0.7);
			expect(dymo2.getParts()[0].getParameter(AMPLITUDE).getValue()).toBe(0.7);
			expect(dymo2.getParts()[1].getParameter(AMPLITUDE).getValue()).toBeCloseTo(0.3, 10);
			done();
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
	
	it("loads same dymo as written", function(done) {
		var oReq = new XMLHttpRequest();
		oReq.addEventListener("load", function() {
			var loadedJson = JSON.parse(this.responseText);
			var loader = new DymoLoader(scheduler);
			loader.loadDymoFromJson(dymo2Path, function(loadedDymo) {
				var writtenJson = loadedDymo[0].toJsonHierarchy();
				expect(JSON.stringify(writtenJson)).toEqual(JSON.stringify(loadedJson));
				expect(writtenJson).toEqual(loadedJson);
				done();
			});
		});
		oReq.open("GET", dymo2Path);
		oReq.send();
	});
	
	it("loads dymos that have parts in other files", function(done) {
		var oReq = new XMLHttpRequest();
		oReq.addEventListener("load", function() {
			var loadedJson = JSON.parse(this.responseText);
			var loader = new DymoLoader(scheduler);
			loader.loadDymoFromJson(dymo3Path, function(loadedDymo) {
				var dymo3 = loadedDymo[0];
				var dymoMap3 = loadedDymo[1];
				expect(dymo3.getUri()).toEqual("dymo");
				expect(dymo3.getParts().length).toBe(1);
				expect(dymo3.getParts()[0].getParts().length).toBe(2);
				expect(Object.keys(dymoMap3).length).toBe(4);
				done();
			});
		});
		oReq.open("GET", dymo3Path);
		oReq.send();
	});
	
});