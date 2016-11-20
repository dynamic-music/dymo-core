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
		DYMO_STORE = new DymoStore(function() {
			scheduler = new Scheduler(audioContext);
			loader = new DymoLoader(DYMO_STORE);
			fadePosition = 0;
			isPlaying = false;
			done();
		});
	});

	it("loads a dymo from json", function(done) {
		loader.loadDymoFromJson(dymoPath, function(loadedDymo) {
			topDymoUri = loadedDymo[0];
			scheduler.init(null, topDymoUri);
			//dymoMap = loadedDymo[1];
			expect(topDymoUri).toEqual(CONTEXT_URI+"dymo0");
			//test if initial parameter value loaded correctly
			expect(DYMO_STORE.findParameterValue(CONTEXT_URI+"dymo4", AMPLITUDE)).toEqual(0.5);
			expect(DYMO_STORE.findParameterValue(CONTEXT_URI+"dymo76", AMPLITUDE)).toBeUndefined();
			//expect(dymoMap[CONTEXT_URI+"dymo76"].getParameter(AMPLITUDE).getValue()).toEqual(1);
			expect(DYMO_STORE.findParts(topDymoUri).length).toBe(330);
			expect(DYMO_STORE.findAllObjectsInHierarchy(topDymoUri).length).toBe(331);
			//expect(Object.keys(dymoMap).length).toBe(331);
			done();
		});
	});

	it("loads higher-level parameters from json", function(done) {
		loader.loadDymoFromJson(mixDymoPath, function(loadedDymo) {
			var topDymoUri2 = loadedDymo[0];
			expect(topDymoUri2).toEqual(CONTEXT_URI+"mixdymo");
			expect(DYMO_STORE.findParts(CONTEXT_URI+"mixdymo").length).toBe(2);
			expect(DYMO_STORE.findAllObjectsInHierarchy(topDymoUri2).length).toBe(9);
			//expect(DYMO_STORE.findParameterValue(CONTEXT_URI+"mixdymo", CONTEXT_URI+"Fade")).not.toBeUndefined();
			//expect(dymo2.getParameter(CONTEXT_URI+"Fade").getObservers().length).toBe(1);
			DYMO_STORE.setParameter(CONTEXT_URI+"mixdymo", CONTEXT_URI+"Fade", 0.7);
			var parts = DYMO_STORE.findParts(CONTEXT_URI+"mixdymo");
			expect(DYMO_STORE.findParameterValue(parts[0], AMPLITUDE)).toBeCloseTo(0.3, 10);
			expect(DYMO_STORE.findParameterValue(parts[1], AMPLITUDE)).toBe(0.7);
			done();
		});
	});

	it("loads a control rendering from json", function(done) {
		loader.loadDymoFromJson(dymo2Path, function(loadedDymo) {
			loader.loadRenderingFromJson(controlRenderingPath, function(loadedRendering) {
				rendering = loadedRendering[0];
				var controls = loadedRendering[1];
				var mappings = Object.values(loader.getMappings());
				expect(mappings.length).toEqual(3);
				expect(mappings[0].getTargets().length).toEqual(1);
				expect(mappings[1].getTargets()).toBeUndefined();
				expect(mappings[2].getTargets().length).toEqual(3);
				//change feature and see if selection of dymos adjusts!
				DYMO_STORE.setParameter(CONTEXT_URI+"dymo1", DURATION_RATIO, 0.9);
				expect(mappings[0].getTargets().length).toEqual(2);
				expect(Object.keys(controls).length).toEqual(3);
				expect(DYMO_STORE.findParameterValue(null, LISTENER_ORIENTATION)).toBeUndefined();
				controls[CONTEXT_URI+"orientation"].updateValue(0.5);
				expect(DYMO_STORE.findParameterValue(null, LISTENER_ORIENTATION)).toBe(180);
				done();
			});
		});
	});

	/*it("loads a similarity graph from json", function(done) {
		loader.loadDymoFromJson(dymoPath, function(loadedDymo) {
			loader.loadGraphFromJson(similarityGraphPath, function() {
				//dymo = loadedDymo[0][0];
				console.log(loader.getStore().find(null, HAS_SIMILAR, null));
				loader.getStore().logData()
				loader.getStore().toJsonGraph(DYMO, HAS_SIMILAR, function(similarityGraph) {
					expect(similarityGraph.nodes.length).toBe(331);
					expect(similarityGraph.edges.length).toBe(274);
					done();
				});
			});
		});
	});*/

	/*it("loads same dymo as written", function(done) {
		var comparedDymo = dymo2Path;
		var oReq = new XMLHttpRequest();
		oReq.addEventListener("load", function() {
			var loadedJson = JSON.parse(this.responseText);
			loader.loadDymoFromJson(comparedDymo, function(loadedDymo) {
				//loader.getStore().logData();
				loader.getStore().writeJsonld(function(writtenJson){
					//TODO CHECK WHY JSONLD DOESNT USE SOME TERMS!!!!
					expect(JSON.parse(writtenJson)).toEqual(loadedJson);
					//console.log(JSON.stringify(loadedJson), JSON.stringify(JSON.parse(writtenJson)));
					done();
				});
			});
		});
		oReq.open("GET", comparedDymo);
		oReq.send();
	});*/

	it("loads dymos that have parts in other files", function(done) {
		loader.loadDymoFromJson(dymo3Path, function(loadedDymo) {
			var topDymoUri3 = loadedDymo[0];
			expect(topDymoUri3).toEqual(CONTEXT_URI+"dymo");
			var parts = DYMO_STORE.findParts(CONTEXT_URI+"dymo");
			expect(parts.length).toBe(1);
			expect(DYMO_STORE.findParts(parts[0]).length).toBe(3);
			expect(DYMO_STORE.findAllObjectsInHierarchy(topDymoUri3).length).toBe(5);
			done();
		});
	});

});
