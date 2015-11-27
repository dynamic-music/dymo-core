describe("a parameter", function() {
	
	var value = 0;
	var valueFunction = function() { return ++value; };
	var parameter = new Parameter("high-level", 0);
	var dymo1 = new DynamicMusicObject("dymo1");
	dymo1.setFeature(ONSET_FEATURE, 5);
	var dymo2 = new DynamicMusicObject("dymo2");
	dymo2.setFeature(ONSET_FEATURE, 3);
	parameter.addObserver(new Mapping([parameter, ONSET_FEATURE], undefined, 'new Function("a", "b", "return a * b;");', [dymo1, dymo2], AMPLITUDE));
	
	it("can map to other parameters", function() {
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(1);
		parameter.update(undefined, 0.3);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(1.5);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.9, 10);
		parameter.update(undefined, 0.1);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(0.5);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.3, 10);
	});
	
	it("updates subdymo parameters", function() {
		dymo1.addPart(dymo2);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(0.5);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.3, 10);
		dymo2.getParameter(AMPLITUDE).update(undefined, 0.2);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.2, 10);
		dymo1.getParameter(AMPLITUDE).update(undefined, 0.7);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(0.7);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.4, 10);
	});
	
});