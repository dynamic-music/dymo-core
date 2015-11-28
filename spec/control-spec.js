describe("a control", function() {
	
	it("can change its value on request", function() {
		var value = 0;
		var valueFunction = function() { return ++value; };
		var control = new Control("control1", SLIDER, valueFunction);
		expect(control.getValue()).toBeUndefined();
		expect(control.requestValue()).toBe(1);
		expect(control.getValue()).toBe(1);
		expect(control.requestValue()).toBe(2);
		expect(control.getValue()).toBe(2);
		expect(control.requestValue()).toBe(3);
	});
	
	it("can create a reference value from the average input", function() {
		var control = new Control("control2", COMPASS_HEADING);
		control.setReferenceAverageCount(3);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		control.update(2);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		control.update(4);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		control.update(6);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBeUndefined();
		control.update(5);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBe(1);
		control.update(2);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBe(-2);
		control.resetReferenceValue();
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		control.update(1);
		control.update(6);
		control.update(8);
		control.update(4);
		expect(control.getReferenceValue()).toBe(5);
		expect(control.getValue()).toBe(-1);
	});
	
	it("can update its value periodically", function(done) {
		var statsControls = new StatsControls();
		statsControls.frequency.update(undefined, 50);
		var randomControl = statsControls.randomControl;
		setTimeout(function() {
			var firstValue = randomControl.getValue();
			expect(firstValue).toBeGreaterThan(0);
			expect(firstValue).toBeLessThan(1);
			setTimeout(function() {
				var secondValue = randomControl.getValue();
				expect(secondValue).toBeGreaterThan(0);
				expect(secondValue).toBeLessThan(1);
				expect(secondValue).not.toEqual(firstValue);
				done();
			}, 60);
		}, 60);
	});
	
});