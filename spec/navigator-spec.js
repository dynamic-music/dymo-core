describe("a navigator", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var dymo1, dymo2, dymo3, dymo4, dymo5, dymo6, dymo7;
	
	beforeEach(function() {
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		dymo1 = new DynamicMusicObject("dymo1");
		dymo2 = new DynamicMusicObject("dymo2");
		dymo3 = new DynamicMusicObject("dymo3");
		dymo4 = new DynamicMusicObject("dymo4");
		dymo5 = new DynamicMusicObject("dymo5");
		dymo6 = new DynamicMusicObject("dymo6");
		dymo7 = new DynamicMusicObject("dymo7");
		dymo8 = new DynamicMusicObject("dymo8");
		dymo9 = new DynamicMusicObject("dymo9");
		dymo10 = new DynamicMusicObject("dymo10");
		dymo11 = new DynamicMusicObject("dymo11");
		dymo12 = new DynamicMusicObject("dymo12");
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo1.addPart(dymo4);
		dymo2.addPart(dymo5);
		dymo2.addPart(dymo6);
		dymo3.addPart(dymo7);
		dymo3.addPart(dymo8);
		dymo3.addPart(dymo9);
		dymo4.addPart(dymo10);
		dymo8.addPart(dymo11);
		dymo8.addPart(dymo12);
		
		dymo5.addSimilar(dymo7);
		dymo7.addSimilar(dymo5);
		dymo6.addSimilar(dymo9);
		dymo8.addSimilar(dymo10);
		dymo10.addSimilar(dymo6);
		//dymo2.addSimilar(dymo3);
		//dymo3.addSimilar(dymo2);
		//dymo4.addSimilar(dymo5);
		//dymo4.addSimilar(dymo6);
	});
	
	it("can be sequential", function() {
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(dymo1));
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo5");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo6");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo11");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo12");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
		navigator.reset();
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo5");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo6");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo11");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo12");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
	});
	
	it("has getters and setters for its position", function() {
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(dymo1));
		expect(navigator.getPosition(0)).toBeUndefined();
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo5");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo6");
		expect(navigator.getPosition(0)).toBe(0);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(0);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
		navigator.setPosition(1, 0);
		navigator.setPosition(1, 1);
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo11");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(0);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo12");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(1);
		expect(navigator.getPosition(2)).toBe(1);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getPosition(0)).toBe(1);
		expect(navigator.getPosition(1)).toBe(2);
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getPosition(0)).toBe(2);
		expect(navigator.getPosition(1)).toBe(0);
	});
	
	it("can handle conjunctions", function() {
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(dymo1));
		dymo2.setType(CONJUNCTION);
		dymo8.setType(CONJUNCTION);
		var nextParts = navigator.getNextParts();
		expect(nextParts[0].getUri()).toBe("dymo5");
		expect(nextParts[1].getUri()).toBe("dymo6");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		nextParts = navigator.getNextParts();
		expect(nextParts[0].getUri()).toBe("dymo11");
		expect(nextParts[1].getUri()).toBe("dymo12");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
	});
	
	it("can have various subset navigators", function() {
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(dymo1));
		navigator.addSubsetNavigator(function(d){return d.getLevel() == 1;}, new SequentialNavigator(dymo1, true));
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo6");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo5");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo11");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo12");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
	});
	
	it("can have missing subset navigators", function() {
		var navigator = new DymoNavigator(dymo1);
		navigator.addSubsetNavigator(function(d){return d.getLevel() <= 1;}, new SequentialNavigator(dymo1));
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo5");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo6");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo7");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo8");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo9");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo10");
		expect(navigator.getNextParts()).toBeUndefined();
		var navigator = new DymoNavigator(dymo1);
		navigator.addSubsetNavigator(function(d){return d.getLevel() == 0;}, new SequentialNavigator(dymo1));
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo2");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo3");
		expect(navigator.getNextParts()[0].getUri()).toBe("dymo4");
	});
	
	it("can also be based on similarity", function() {
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		dymo1 = new DynamicMusicObject("dymo1");
		dymo2 = new DynamicMusicObject("dymo2");
		dymo3 = new DynamicMusicObject("dymo3");
		dymo4 = new DynamicMusicObject("dymo4");
		dymo5 = new DynamicMusicObject("dymo5");
		dymo6 = new DynamicMusicObject("dymo6");
		dymo7 = new DynamicMusicObject("dymo7");
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo1.addPart(dymo4);
		dymo1.addPart(dymo5);
		dymo1.addPart(dymo6);
		dymo1.addPart(dymo7);
		
		dymo2.addSimilar(dymo3);
		dymo3.addSimilar(dymo2);
		dymo4.addSimilar(dymo5);
		dymo4.addSimilar(dymo6);
		
		
		//test without replacing of objects (probability 0)
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(), new RepeatedNavigator());
		var simNav = new SimilarityNavigator(dymo1)
		navigator.addSubsetNavigator(function(d){return d.getLevel() == 0;}, simNav);
		simNav.leapingProbability.update(0);
		simNav.continueAfterLeaping.update(0);
		expect(["dymo2"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo4"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo7"]).toContain(navigator.getNextParts()[0].getUri());
		expect(navigator.getNextParts()).toBeUndefined();
		
		
		//test replacing of objects with similars (probability 1)
		navigator.reset();
		simNav.leapingProbability.update(1);
		expect(["dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo7"]).toContain(navigator.getNextParts()[0].getUri());
		expect(navigator.getNextParts()).toBeUndefined();
		
		
		//test replacing of objects with similars (probability 0.5)
		navigator.reset();
		simNav.leapingProbability.update(0.5);
		expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo7"]).toContain(navigator.getNextParts()[0].getUri());
		expect(navigator.getNextParts()).toBeUndefined();
		
		
		//test leaping and continuing
		navigator.reset();
		simNav.continueAfterLeaping.update(1);
		expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3","dymo4","dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo3","dymo4","dymo5","dymo6","dymo7"]).toContain(navigator.getNextParts()[0].getUri());
	});
	
	it("can navigate directed graphs", function() {
		dymo1 = new DynamicMusicObject("dymo1");
		dymo2 = new DynamicMusicObject("dymo2");
		dymo3 = new DynamicMusicObject("dymo3");
		dymo4 = new DynamicMusicObject("dymo4");
		dymo5 = new DynamicMusicObject("dymo5");
		dymo6 = new DynamicMusicObject("dymo6");
		dymo7 = new DynamicMusicObject("dymo7");
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo1.addPart(dymo4);
		dymo1.addPart(dymo5);
		dymo1.addPart(dymo6);
		dymo1.addPart(dymo7);
		
		dymo2.addSimilar(dymo3);
		dymo3.addSimilar(dymo2);
		dymo4.addSimilar(dymo5);
		dymo4.addSimilar(dymo6);
		
		
		//test without replacing of objects (probability 0)
		var navigator = new DymoNavigator(dymo1, new SequentialNavigator(), new RepeatedNavigator());
		var graphNav = new GraphNavigator(dymo1)
		navigator.addSubsetNavigator(function(d){return d.getLevel() == 0;}, graphNav);
		expect(["dymo2"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo3"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo4"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo3","dymo5","dymo6"]).toContain(navigator.getNextParts()[0].getUri());
		expect(["dymo2","dymo4","dymo6","dymo7"]).toContain(navigator.getNextParts()[0].getUri());
	});
	
	it("can be loaded from a rendering", function(done) {
		var manager = new DymoManager(audioContext);
		manager.loadDymoAndRendering('files/similarity-dymo.json', 'files/similarity-rendering.json', undefined, function() {
			var dymo = manager.getTopDymo();
			expect(dymo.getParts().length).toBe(5);
			expect(dymo.getParts()[1].getSimilars().length).toBe(1);
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