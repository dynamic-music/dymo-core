describe("a dymoloader", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var dymo, dymoMap, scheduler, rendering, manager;
	var dymoPath = 'files/dymo.json';
	var fixdymoPath = 'files/fixdymo.json'
	var dymo2Path = 'files/dymo2.json';
	var dymo3Path = 'files/dymo3.json';
	var mixDymoPath = 'files/mixdymo.json';
	var featureRenderingPath = 'files/feature-rendering.json';
	var controlRenderingPath = 'files/control-rendering.json';
	var similarityGraphPath = 'files/similarity.json';
	var reverbPath = '../audio/impulse_rev.wav';
	
	beforeEach(function(done) {
		scheduler = new Scheduler(audioContext);
		loader = new DymoLoader(scheduler, function() {
			done();
		});
		fadePosition = 0;
		isPlaying = false;
	});
	
	it("loads a dymo from json", function(done) {
		/*scheduler = new Scheduler(audioContext, function(num) {
			/*setTimeout(function() {
				scheduler.play(dymo);
				//expect(scheduler.urisOfPlayingDmos).toEqual(["dymo1"]);
				scheduler.stop(dymo);
				done();
			}, 2000);
		});
		scheduler.setReverbFile(reverbPath);*/
		loader.loadDymoFromJson(dymoPath, function(loadedDymo) {
			dymo = loadedDymo[0];
			scheduler.loadBuffers(dymo);
			dymoMap = loadedDymo[1];
			expect(dymo.getUri()).toEqual(CONTEXT_URI+"dymo0");
			//test if initial parameter value loaded correctly
			expect(dymoMap[CONTEXT_URI+"dymo4"].getParameter(AMPLITUDE).getValue()).toEqual(0.5);
			expect(dymoMap[CONTEXT_URI+"dymo76"].getParameter(AMPLITUDE).getValue()).toEqual(1);
			expect(dymo.getParts().length).toBe(330);
			expect(Object.keys(dymoMap).length).toBe(331);
			done();
		});
	});
	
	it("loads higher-level parameters from json", function(done) {
		loader.loadDymoFromJson(mixDymoPath, function(loadedDymo) {
			var dymo2 = loadedDymo[0];
			var dymoMap2 = loadedDymo[1];
			expect(dymo2.getUri()).toEqual(CONTEXT_URI+"mixdymo");
			expect(dymo2.getParts().length).toBe(2);
			expect(Object.keys(dymoMap2).length).toBe(9);
			expect(dymo2.getParameter(CONTEXT_URI+"Fade")).not.toBeUndefined();
			expect(dymo2.getParameter(CONTEXT_URI+"Fade").getObservers().length).toBe(1);
			dymo2.getParameter(CONTEXT_URI+"Fade").update(0.7);
			expect(dymo2.getParts()[0].getParameter(AMPLITUDE).getValue()).toBeCloseTo(0.3, 10);
			expect(dymo2.getParts()[1].getParameter(AMPLITUDE).getValue()).toBe(0.7);
			done();
		});
	});
	
	it("loads a control rendering from json", function(done) {
		loader.loadRenderingFromJson(controlRenderingPath, dymoMap, function(loadedRendering) {
			rendering = loadedRendering[0];
			controls = loadedRendering[1];
			expect(rendering.getMappings().length).toEqual(3);
			expect(Object.keys(controls).length).toEqual(3);
			expect(scheduler.getParameter(LISTENER_ORIENTATION).getValue()).toBe(0);
			controls[CONTEXT_URI+"orientation"].update(0.5);
			expect(scheduler.getParameter(LISTENER_ORIENTATION).getValue()).toBe(180);
			done();
		});
	});
	
	it("loads a similarity graph from json", function(done) {
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
			loader.loadDymoFromJson(dymo2Path, function(loadedDymo) {
				//loader.getStore().logData();
				loader.getStore().writeJsonld(function(writtenJson){
					//TODO CHECK WHY JSONLD DOESNT USE SOME TERMS!!!!
					expect(JSON.parse(writtenJson)).toEqual(loadedJson);
					//console.log(JSON.stringify(loadedJson), JSON.stringify(JSON.parse(writtenJson)));
					done();
				});
			});
		});
		oReq.open("GET", dymo2Path);
		oReq.send();
	});
	
	it("loads dymos that have parts in other files", function(done) {
		loader.loadDymoFromJson(dymo3Path, function(loadedDymo) {
			var dymo3 = loadedDymo[0];
			var dymoMap3 = loadedDymo[1];
			expect(dymo3.getUri()).toEqual(CONTEXT_URI+"dymo");
			expect(dymo3.getParts().length).toBe(1);
			expect(dymo3.getParts()[0].getParts().length).toBe(3);
			expect(Object.keys(dymoMap3).length).toBe(5);
			done();
		});
	});
	
});