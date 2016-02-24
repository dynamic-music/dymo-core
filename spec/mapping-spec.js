describe("a mapping", function() {
	
	var value = 0;
	var control = new Control("control1", SLIDER);
	var dymo1 = new DynamicMusicObject("dymo1");
	dymo1.setFeature(ONSET_FEATURE, 5);
	var dymo2 = new DynamicMusicObject("dymo2");
	dymo2.setFeature(ONSET_FEATURE, 3);
	var mapping = new Mapping([control, ONSET_FEATURE], undefined, {args:["a", "b"], body:"return a * b;"}, [dymo1, dymo2], AMPLITUDE);
	
	it("updates a parameter", function() {
		expect(dymo1.getParameter(AMPLITUDE).getValue()).toBe(1);
		control.update(0.3);
		expect(dymo1.getParameter(AMPLITUDE).getValue()).toBe(1.5);
		expect(dymo2.getParameter(AMPLITUDE).getValue()).toBeCloseTo(0.9, 10);
		control.update(0.1);
		expect(dymo1.getParameter(AMPLITUDE).getValue()).toBe(0.5);
		expect(dymo2.getParameter(AMPLITUDE).getValue()).toBeCloseTo(0.3, 10);
	});
	
	it("updates a control parameter", function() {
		var control2 = new Control("control2", SLIDER);
		var ramp = new RampControls().linearRampControl;
		var mapping2 = new Mapping([control2], undefined, {args:["a"], body:"return a;"}, [ramp], RAMP_TRIGGER);
		control2.update(1);
		expect(ramp.getParameter(RAMP_TRIGGER).getValue()).toBe(1);
		control2.update(0);
		expect(ramp.getParameter(RAMP_TRIGGER).getValue()).toBe(0);
	});
	
	it("updates a control with inverse if possible", function() {
		//currently non-invertible function
		expect(dymo1.getParameter(AMPLITUDE).getValue()).toBe(0.5);
		expect(control.getValue()).toBe(0.1);
		dymo1.getParameter(AMPLITUDE).update(5);
		expect(control.getValue()).toBe(5);
		//currently invertible function
		var dymo3 = new DynamicMusicObject("dymo3");
		var mapping = new Mapping([control, ONSET_FEATURE], undefined, {args:["a", "b"], body:"return 5*a-1;"}, [dymo3], AMPLITUDE);
		expect(dymo3.getParameter(AMPLITUDE).getValue()).toBe(24);
		control.update(0.3);
		expect(dymo3.getParameter(AMPLITUDE).getValue()).toBe(0.5);
		dymo3.getParameter(AMPLITUDE).update(1);
		expect(control.getValue()).toBe(0.4);
		dymo3.getParameter(AMPLITUDE).update(4);
		expect(control.getValue()).toBe(1);
	});
	
	it("requests a value", function() {
		expect(mapping.requestValue(dymo1)).toBe(5);
		/*expect(mapping.requestValue(dymo1)).toBe(10);
		expect(mapping.requestValue(dymo2)).toBe(9);
		expect(mapping.requestValue(dymo2)).toBe(12);
		expect(mapping.requestValue(dymo2)).toBe(15);*/
	});
	
});