describe("a control", function() {
	
	var value = 0;
	var valueFunction = function() { return ++value; };
	var control = new Control(0, "control1", SLIDER, undefined, valueFunction);
	
	it("can change its value on request", function() {
		expect(control.value).toBeUndefined();
		expect(control.requestValue()).toBe(1);
		expect(control.value).toBe(1);
		expect(control.requestValue()).toBe(2);
		expect(control.value).toBe(2);
		expect(control.requestValue()).toBe(3);
	});
	
});