describe("a control", function() {
	
	/*it("can change its value on request", function() {
		var value = 0;
		var valueFunction = function() { return ++value; };
		var control = new Control("control1", SLIDER, valueFunction);
		expect(control.getValue()).toBeUndefined();
		expect(control.requestValue()).toBe(1);
		expect(control.getValue()).toBe(1);
		expect(control.requestValue()).toBe(2);
		expect(control.getValue()).toBe(2);
		expect(control.requestValue()).toBe(3);
	});*/
	
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
	
	it("can be a random control", function(done) {
		var randomControl = new RandomControl();
		//check if inheritance works
		expect(randomControl.getParameter(AUTO_CONTROL_FREQUENCY)).not.toBeUndefined();
		expect(randomControl.getParameter(AUTO_CONTROL_TRIGGER)).not.toBeUndefined();
		expect(randomControl.observedParameterChanged).not.toBeUndefined();
		expect(randomControl.reset).not.toBeUndefined();
		//test updating
		randomControl.getParameter(AUTO_CONTROL_FREQUENCY).update(50);
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
		var brownianControl = new BrownianControl();
		brownianControl.getParameter(AUTO_CONTROL_FREQUENCY).update(50);
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
	
	it("can be a ramp control", function(done) {
		var rampControl = new RampControl(200);
		rampControl.getParameter(AUTO_CONTROL_FREQUENCY).update(20);
		expect(rampControl.getValue()).toBe(0);
		//turn on
		rampControl.getParameter(AUTO_CONTROL_TRIGGER).update(1);
		setTimeout(function() {
			var firstValue = rampControl.getValue();
			expect(firstValue).toBeGreaterThan(0);
			expect(firstValue).toBeCloseTo(0.3, 8);
			setTimeout(function() {
				var secondValue = rampControl.getValue();
				expect(secondValue).toBeCloseTo(0.6, 8);
				expect(secondValue).toBeLessThan(1);
				expect(secondValue).not.toEqual(firstValue);
				//stop and switch directions
				rampControl.getParameter(AUTO_CONTROL_TRIGGER).update(0);
				setTimeout(function() {
					var thirdValue = rampControl.getValue();
					expect(thirdValue).toBeCloseTo(0.6, 8);
					expect(thirdValue).toEqual(secondValue);
					//turn on again
					rampControl.getParameter(AUTO_CONTROL_TRIGGER).update(1);
					setTimeout(function() {
						var fourthValue = rampControl.getValue();
						expect(fourthValue).toBeCloseTo(0.3, 8);
						done();
					}, 60);
				}, 60);
			}, 60);
		}, 60);
	});
	
});