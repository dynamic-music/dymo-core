describe("a navigator", function() {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	beforeEach(function(done) {
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1");
			DYMO_STORE.addDymo("dymo2", "dymo1");
			DYMO_STORE.addDymo("dymo3", "dymo1");
			DYMO_STORE.addDymo("dymo4", "dymo1");
			DYMO_STORE.addDymo("dymo5", "dymo2");
			DYMO_STORE.addDymo("dymo6", "dymo2");
			DYMO_STORE.addDymo("dymo7", "dymo3");
			DYMO_STORE.addDymo("dymo8", "dymo3");
			DYMO_STORE.addDymo("dymo9", "dymo3");
			DYMO_STORE.addDymo("dymo10", "dymo4");
			DYMO_STORE.addDymo("dymo11", "dymo8");
			DYMO_STORE.addDymo("dymo12", "dymo8");
			DYMO_STORE.addSimilar("dymo5", "dymo7");
			DYMO_STORE.addSimilar("dymo7", "dymo5");
			DYMO_STORE.addSimilar("dymo6", "dymo9");
			DYMO_STORE.addSimilar("dymo8", "dymo10");
			DYMO_STORE.addSimilar("dymo10", "dymo6");
			//dymo2.addSimilar(dymo3);
			//dymo3.addSimilar(dymo2);
			//dymo4.addSimilar(dymo5);
			//dymo4.addSimilar(dymo6);
			done();
		});
	});

	it("can be sequential", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
		navigator.reset();
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
	});

	it("has getters and setters for its position", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		expect(navigator.getPosition(0)).toBeUndefined();
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
		navigator.setPosition(1, 0);
		navigator.setPosition(1, 1);
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
	});

	it("can handle conjunctions", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		DYMO_STORE.setTriple("dymo2", CDT, CONJUNCTION);
		DYMO_STORE.setTriple("dymo8", CDT, CONJUNCTION);
		var nextParts = navigator.getNextParts();
		expect(nextParts[0]).toBe("dymo5");
		expect(nextParts[1]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		nextParts = navigator.getNextParts();
		expect(nextParts[0]).toBe("dymo11");
		expect(nextParts[1]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
	});

	it("can have various subset navigators", function() {
		var navigator = new DymoNavigator("dymo1", new SequentialNavigator("dymo1"));
		navigator.addSubsetNavigator(function(d){return DYMO_STORE.findLevel(d) == 1;}, new SequentialNavigator("dymo1", true));
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo11");
		expect(navigator.getNextParts()[0]).toBe("dymo12");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
	});

	it("can have missing subset navigators", function() {
		var navigator = new DymoNavigator("dymo1");
		navigator.addSubsetNavigator(function(d){return DYMO_STORE.findLevel(d) <= 1;}, new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo5");
		expect(navigator.getNextParts()[0]).toBe("dymo6");
		expect(navigator.getNextParts()[0]).toBe("dymo7");
		expect(navigator.getNextParts()[0]).toBe("dymo8");
		expect(navigator.getNextParts()[0]).toBe("dymo9");
		expect(navigator.getNextParts()[0]).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
		var navigator = new DymoNavigator("dymo1");
		navigator.addSubsetNavigator(function(d){return DYMO_STORE.findLevel(d) == 0;}, new SequentialNavigator("dymo1"));
		expect(navigator.getNextParts()[0]).toBe("dymo2");
		expect(navigator.getNextParts()[0]).toBe("dymo3");
		expect(navigator.getNextParts()[0]).toBe("dymo4");
	});

	it("can also be based on similarity", function(done) {
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1");
			DYMO_STORE.addDymo("dymo2", "dymo1");
			DYMO_STORE.addDymo("dymo3", "dymo1");
			DYMO_STORE.addDymo("dymo4", "dymo1");
			DYMO_STORE.addDymo("dymo5", "dymo1");
			DYMO_STORE.addDymo("dymo6", "dymo1");
			DYMO_STORE.addDymo("dymo7", "dymo1");
			DYMO_STORE.addSimilar("dymo2", "dymo3");
			DYMO_STORE.addSimilar("dymo3", "dymo2");
			DYMO_STORE.addSimilar("dymo4", "dymo5");
			DYMO_STORE.addSimilar("dymo4", "dymo6");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", new SequentialNavigator(), new RepeatedNavigator());
			var simNav = new SimilarityNavigator("dymo1")
			navigator.addSubsetNavigator(function(d){return DYMO_STORE.findLevel(d) == 0;}, simNav);
			DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 0);
			DYMO_STORE.setParameter(null, CONTINUE_AFTER_LEAPING, 0);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo4"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			expect(navigator.getNextParts()).toBeUndefined();


			//test replacing of objects with similars (probability 1)
			navigator.reset();
			DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 1);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			expect(navigator.getNextParts()).toBeUndefined();


			//test replacing of objects with similars (probability 0.5)
			navigator.reset();
			DYMO_STORE.setParameter(null, LEAPING_PROBABILITY, 0.5);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo5"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo7"]).toContain(navigator.getNextParts()[0]);
			expect(navigator.getNextParts()).toBeUndefined();


			//test leaping and continuing
			navigator.reset();
			DYMO_STORE.setParameter(null, CONTINUE_AFTER_LEAPING, 1);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo3","dymo4","dymo5","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can navigate directed graphs", function(done) {
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1");
			DYMO_STORE.addDymo("dymo2", "dymo1");
			DYMO_STORE.addDymo("dymo3", "dymo1");
			DYMO_STORE.addDymo("dymo4", "dymo1");
			DYMO_STORE.addDymo("dymo5", "dymo1");
			DYMO_STORE.addDymo("dymo6", "dymo1");
			DYMO_STORE.addDymo("dymo7", "dymo1");
			DYMO_STORE.addSuccessor("dymo2", "dymo3");
			DYMO_STORE.addSuccessor("dymo3", "dymo2");
			DYMO_STORE.addSuccessor("dymo4", "dymo5");
			DYMO_STORE.addSuccessor("dymo4", "dymo6");

			//test without replacing of objects (probability 0)
			var navigator = new DymoNavigator("dymo1", new SequentialNavigator(), new RepeatedNavigator());
			var graphNav = new GraphNavigator("dymo1")
			navigator.addSubsetNavigator(function(d){return DYMO_STORE.findLevel(d) == 0;}, graphNav);
			expect(["dymo2"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo3","dymo5","dymo6"]).toContain(navigator.getNextParts()[0]);
			expect(["dymo2","dymo4","dymo6","dymo7"]).toContain(navigator.getNextParts()[0]);
			done();
		});
	});

	it("can be loaded from a rendering", function(done) {
		var manager = new DymoManager(audioContext, null, null, function() {
			manager.loadDymoAndRendering('files/similarity-dymo.json', 'files/similarity-rendering.json', undefined, function() {
				var dymoUri = manager.getTopDymo();
				expect(DYMO_STORE.findParts(dymoUri).length).toBe(5);
				expect(DYMO_STORE.findSimilars(DYMO_STORE.findParts(dymoUri)[1]).length).toBe(1);
				var navigators = manager.getRendering().getNavigator().getSubsetNavigators();
				expect(navigators.length).toBe(2);
				//expect(navigators[0][0]).toEqual(REPEATED_NAVIGATOR);
				expect(navigators[0][1].getType()).toEqual(REPEATED_NAVIGATOR);
				expect(navigators[1][1].getType()).toEqual(SIMILARITY_NAVIGATOR);
				manager.startPlaying();
				setTimeout(function() {
					manager.stopPlaying();
					done();
				}, 50);
			});
		});
	});

});
