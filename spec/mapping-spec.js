describe("a mapping", function() {
	
	var value = 0;
	var valueFunction = function() { return ++value; };
	var control = new Control(0, "control1", SLIDER, undefined, valueFunction);
	var dymo1 = new DynamicMusicObject("dymo1");
	dymo1.setFeature(ONSET_FEATURE, 5);
	var dymo2 = new DynamicMusicObject("dymo2");
	dymo2.setFeature(ONSET_FEATURE, 3);
	var mapping = new Mapping([control, ONSET_FEATURE], undefined, 'new Function("a", "b", "return a * b;");', [dymo1, dymo2], AMPLITUDE);
	
	it("updates a parameter", function() {
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(1);
		control.value = 0.3;
		mapping.updateParameter(0.3, control);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(1.5);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.9, 10);
		control.updateMappings(0.1);
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(0.5);
		expect(dymo2.getParameter(AMPLITUDE).value).toBeCloseTo(0.3, 10);
	});
	
	it("updates a control but without inverse", function() {
		expect(dymo1.getParameter(AMPLITUDE).value).toBe(0.5);
		expect(control.value).toBe(0.1);
		dymo1.getParameter(AMPLITUDE).update(undefined, 5);
		expect(control.value).toBe(5);
	});
	
	it("requests a value", function() {
		expect(mapping.requestValue(dymo1)).toBe(5);
		expect(mapping.requestValue(dymo1)).toBe(10);
		expect(mapping.requestValue(dymo2)).toBe(9);
		expect(mapping.requestValue(dymo2)).toBe(12);
		expect(mapping.requestValue(dymo2)).toBe(15);
	});
	
});