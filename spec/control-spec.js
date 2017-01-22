import { DymoStore } from '../src/io/dymostore'
import { RandomControl } from '../src/controls/auto/randomcontrol'
import { BrownianControl } from '../src/controls/auto/browniancontrol'
import { RampControl } from '../src/controls/auto/rampcontrol'
import { WeatherControl } from '../src/controls/data/weathercontrol'
import { GlobalVars } from '../src/globals/globals'
import { AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER } from '../src/globals/uris'

describe("a control", function() {

	beforeAll(function(done) {
		GlobalVars.DYMO_STORE = new DymoStore(function(){
			done();
		});
	});

	it("can be a random control", function(done) {
		var randomControl = new RandomControl("rando");
		//check if inheritance works
		//expect(randomControl.getParameter(AUTO_CONTROL_FREQUENCY)).not.toBeUndefined();
		//expect(randomControl.getParameter(AUTO_CONTROL_TRIGGER)).not.toBeUndefined();
		//expect(randomControl.observedParameterChanged).not.toBeUndefined();
		expect(randomControl.reset).not.toBeUndefined();
		//test updating
		GlobalVars.DYMO_STORE.setParameter("rando", AUTO_CONTROL_FREQUENCY, 50);
		GlobalVars.DYMO_STORE.setParameter("rando", AUTO_CONTROL_TRIGGER, 1);
		setTimeout(function() {
			var firstValue = randomControl.getValue();
			expect(firstValue).toBeGreaterThan(0);
			expect(firstValue).toBeLessThan(1);
			setTimeout(function() {
				var secondValue = randomControl.getValue();
				expect(secondValue).toBeGreaterThan(0);
				expect(secondValue).toBeLessThan(1);
				expect(secondValue).not.toEqual(firstValue);
				GlobalVars.DYMO_STORE.setParameter("rando", AUTO_CONTROL_TRIGGER, 0);
				done();
			}, 60);
		}, 60);
	});

	it("can be a brownian control", function(done) {
		var brownianControl = new BrownianControl("brownie");
		GlobalVars.DYMO_STORE.setParameter("brownie", AUTO_CONTROL_FREQUENCY, 50);
		var currentValue = brownianControl.getValue();
		//expect(currentValue).toBe(0.5);
		var previousValue = currentValue;
		setTimeout(function() {
			var currentValue = brownianControl.getValue();
			expect(currentValue).toBeGreaterThan(0.35);
			expect(currentValue).toBeLessThan(0.65);
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
		var rampControl = new RampControl("rampa", 200);
		GlobalVars.DYMO_STORE.setParameter("rampa", AUTO_CONTROL_FREQUENCY, 20);
		expect(rampControl.getValue()).toBe(0);
		//turn on
		GlobalVars.DYMO_STORE.setParameter("rampa", AUTO_CONTROL_TRIGGER, 1);
		setTimeout(function() {
			var firstValue = rampControl.getValue();
			expect(firstValue).toBeGreaterThan(0);
			expect(firstValue).toBeCloseTo(0.4, 8);
			setTimeout(function() {
				var secondValue = rampControl.getValue();
				expect(secondValue).toBeCloseTo(0.7, 8);
				expect(secondValue).toBeLessThan(1);
				expect(secondValue).not.toEqual(firstValue);
				//stop and switch directions
				GlobalVars.DYMO_STORE.setParameter("rampa", AUTO_CONTROL_TRIGGER, 0);
				setTimeout(function() {
					var thirdValue = rampControl.getValue();
					expect(thirdValue).toBeCloseTo(0.7, 8);
					expect(thirdValue).toEqual(secondValue);
					//turn on again
					GlobalVars.DYMO_STORE.setParameter("rampa", AUTO_CONTROL_TRIGGER, 1);
					setTimeout(function() {
						var fourthValue = rampControl.getValue();
						expect(fourthValue).toBeCloseTo(0.3, 8);
						done();
					}, 60);
				}, 60);
			}, 60);
		}, 60);
	});

	it("can get data from the internet", function(done) {
		var weatherControl = new WeatherControl("weather");
		GlobalVars.DYMO_STORE.setParameter("weather", AUTO_CONTROL_FREQUENCY, 100);
		expect(weatherControl.getValue()).toBeUndefined();
		//turn on
		GlobalVars.DYMO_STORE.setParameter("weather", AUTO_CONTROL_TRIGGER, 1);
		setTimeout(function() {
			var firstValue = weatherControl.getValue();
			expect(firstValue).toBeGreaterThan(200);
			GlobalVars.DYMO_STORE.setParameter("weather", AUTO_CONTROL_TRIGGER, 0);
			done();
		}, 200);
	});

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

	/* TODO MOVE TO SENSOR CONTROL SPEC
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
	});*/

});
