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
	
	it("can be a stats control", function(done) {
		var statsControls = new StatsControls();
		statsControls.frequency.update(50);
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
	
	it("can be a brownian control", function(done) {
		var brownianControls = new BrownianControls();
		brownianControls.frequency.update(50);
		var brownianControl = brownianControls.brownianControl;
		var currentValue = brownianControl.getValue();
		expect(currentValue).toBe(0.5);
		var previousValue = currentValue;
		setTimeout(function() {
			var currentValue = brownianControl.getValue();
			expect(currentValue).toBeGreaterThan(0.4);
			expect(currentValue).toBeLessThan(0.6);
			expect(currentValue).not.toEqual(previousValue);
			var previousValue = currentValue;
			setTimeout(function() {
				var currentValue = brownianControl.getValue();
				expect(currentValue).toBeGreaterThan(0.3);
				expect(currentValue).toBeLessThan(0.7);
				expect(currentValue).not.toEqual(previousValue);
				var previousValue = currentValue;
				setTimeout(function() {
					var currentValue = brownianControl.getValue();
					expect(currentValue).toBeGreaterThan(0.2);
					expect(currentValue).toBeLessThan(0.8);
					expect(currentValue).not.toEqual(previousValue);
					var previousValue = currentValue;
					done();
				}, 60);
			}, 60);
		}, 60);
		
		
	});
	
	it("can be a graph control", function() {
		var graphControls = new GraphControls();
		graphControls.setGraph([[],[],[],[5],[8],[7],[5,6,7,8],[6],[],[5,6,7,8]]);
		graphControls.leapingProbability.update(0);
		for (var i = 0; i < 10; i++) {
			expect(graphControls.nextNodeControl.requestValue()).toBe(i);
		}
		
		graphControls.nextNodeControl.reset();
		graphControls.leapingProbability.update(0.5);
		expect(graphControls.nextNodeControl.requestValue()).toBe(0);
		expect(graphControls.nextNodeControl.requestValue()).toBe(1);
		expect(graphControls.nextNodeControl.requestValue()).toBe(2);
		expect([3,5]).toContain(graphControls.nextNodeControl.requestValue());
		expect([4,8]).toContain(graphControls.nextNodeControl.requestValue());
		expect([5,7]).toContain(graphControls.nextNodeControl.requestValue());
		expect([5,6,7,8]).toContain(graphControls.nextNodeControl.requestValue());
		expect([6,7]).toContain(graphControls.nextNodeControl.requestValue());
		
		graphControls.nextNodeControl.reset();
		graphControls.leapingProbability.update(1);
		expect(graphControls.nextNodeControl.requestValue()).toBe(0);
		expect(graphControls.nextNodeControl.requestValue()).toBe(1);
		expect(graphControls.nextNodeControl.requestValue()).toBe(2);
		expect([5]).toContain(graphControls.nextNodeControl.requestValue());
		expect([8]).toContain(graphControls.nextNodeControl.requestValue());
		expect([7]).toContain(graphControls.nextNodeControl.requestValue());
		expect([5,6,7,8]).toContain(graphControls.nextNodeControl.requestValue());
		expect([6]).toContain(graphControls.nextNodeControl.requestValue());
	});
	
});