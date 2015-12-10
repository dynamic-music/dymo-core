describe("a navigator", function() {
	
	var dymo1, dymo2, dymo3, dymo4, dymo5, dymo6, dymo7;
	
	beforeEach(function() {
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
	});
	
	it("is normally sequential", function() {
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo2");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo3");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo4");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo5");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo6");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo7");
		expect(dymo1.getNextParts()).toBeNull();
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo2");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo3");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo4");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo5");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo6");
		expect(dymo1.getNextParts()[0].getUri()).toBe("dymo7");
	});
	
	it("can also be based on similarity", function() {
		var nav = new SimilarityNavigator(dymo1);
		nav.leapingProbability.update(1);
		dymo1.setNavigator(nav);
		expect(["dymo2","dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo2","dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo4","dymo5","dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo7"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(dymo1.getNextParts()).toBeNull();
		expect(["dymo2","dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo2","dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo4","dymo5","dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo7"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(dymo1.getNextParts()).toBeNull();
		nav.continueAfterLeaping.update(1);
		expect(["dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo2"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo5","dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo2"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo3"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo5"]).toContain(dymo1.getNextParts()[0].getUri());
		expect(["dymo6"]).toContain(dymo1.getNextParts()[0].getUri());
	});
	
});