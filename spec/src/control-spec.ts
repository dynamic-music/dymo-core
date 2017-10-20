import 'isomorphic-fetch';
import { DymoStore } from '../../src/io/dymostore';
import { RandomControl } from '../../src/controls/auto/randomcontrol';
import { BrownianControl } from '../../src/controls/auto/browniancontrol';
import { RampControl } from '../../src/controls/auto/rampcontrol';
import { WeatherControl } from '../../src/controls/data/weathercontrol';
import { SensorControl } from '../../src/controls/sensorcontrol';
import { UNAVAILABLE, CALIBRATING } from '../../src/controls/sensorcontrol';
import { GlobalVars } from '../../src/globals/globals';
import { AUTO_CONTROL_FREQUENCY, AUTO_CONTROL_TRIGGER, COMPASS_HEADING } from '../../src/globals/uris';

describe("a control", function() {

	let store: DymoStore;

	beforeAll(function(done) {
		store = new DymoStore();
		done();
		//store.loadOntologies().then(() => done());
	});

	it("can be a random control", function(done) {
		var randomControl = new RandomControl("rando", store);
		//check if inheritance works
		//expect(randomControl.getParameter(AUTO_CONTROL_FREQUENCY)).not.toBeUndefined();
		//expect(randomControl.getParameter(AUTO_CONTROL_TRIGGER)).not.toBeUndefined();
		//expect(randomControl.observedParameterChanged).not.toBeUndefined();
		expect(randomControl.reset).not.toBeUndefined();
		//test updating
		store.setControlParam("rando", AUTO_CONTROL_FREQUENCY, 50);
		store.setControlParam("rando", AUTO_CONTROL_TRIGGER, 1);
		setTimeout(function() {
			var firstValue = randomControl.getValue();
			expect(firstValue).toBeGreaterThan(0);
			expect(firstValue).toBeLessThan(1);
			setTimeout(function() {
				var secondValue = randomControl.getValue();
				expect(secondValue).toBeGreaterThan(0);
				expect(secondValue).toBeLessThan(1);
				expect(secondValue).not.toEqual(firstValue);
				store.setControlParam("rando", AUTO_CONTROL_TRIGGER, 0);
				done();
			}, 60);
		}, 60);
	});

	it("can be a brownian control", function(done) {
		var brownianControl = new BrownianControl("brownian", store);
		store.setControlParam("brownian", AUTO_CONTROL_FREQUENCY, 50);
		var currentValue = brownianControl.getValue();
		//expect(currentValue).toBe(0.5);
		var previousValue = currentValue;
		setTimeout(function() {
			var currentValue = brownianControl.getValue();
			expect(currentValue).toBeGreaterThan(0.35);
			expect(currentValue).toBeLessThan(0.67);
			expect(currentValue).not.toEqual(previousValue);
			var previousValue = currentValue;
			setTimeout(function() {
				var currentValue = brownianControl.getValue();
				expect(currentValue).toBeGreaterThan(0.3);
				expect(currentValue).toBeLessThan(0.72);
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
		var rampControl = new RampControl("ramp", 200, store);
		store.setControlParam("ramp", AUTO_CONTROL_FREQUENCY, 20);
		expect(rampControl.getValue()).toBe(0);
		//turn on
		store.setControlParam("ramp", AUTO_CONTROL_TRIGGER, 1);
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
				store.setControlParam("ramp", AUTO_CONTROL_TRIGGER, 0);
				setTimeout(function() {
					var thirdValue = rampControl.getValue();
					expect(thirdValue).toBeCloseTo(0.6, 8);
					expect(thirdValue).toEqual(secondValue);
					//turn on again
					store.setControlParam("ramp", AUTO_CONTROL_TRIGGER, 1);
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
		var weatherControl = new WeatherControl("weather", store);
		store.setControlParam("weather", AUTO_CONTROL_FREQUENCY, 100);
		expect(weatherControl.getValue()).toBeUndefined();
		//turn on
		store.setControlParam("weather", AUTO_CONTROL_TRIGGER, 1);
		setTimeout(function() {
			var firstValue = weatherControl.getValue();
			expect(firstValue).toBeGreaterThan(200);
			store.setControlParam("weather", AUTO_CONTROL_TRIGGER, 0);
			done();
		}, 300);
	});

	// TODO MOVE TO SENSOR CONTROL SPEC
	it("can create a reference value from the average input", function() {
		var control = new SensorControl("", COMPASS_HEADING, store);
		control.setReferenceAverageOf(3);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		expect(control.getStatus()).toEqual(UNAVAILABLE);
		control.update(2);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		expect(control.getStatus()).toEqual(CALIBRATING);
		control.update(4);
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		expect(control.getStatus()).toEqual(CALIBRATING);
		control.update(6);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBeUndefined();
		expect(control.getStatus()).toEqual(CALIBRATING);
		control.update(5);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBe(1);
		control.update(2);
		expect(control.getReferenceValue()).toBe(4);
		expect(control.getValue()).toBe(-2);
		control.resetReferenceValueAndAverage();
		expect(control.getReferenceValue()).toBeUndefined();
		expect(control.getValue()).toBeUndefined();
		expect(control.getStatus()).toEqual(UNAVAILABLE);
		control.update(1);
		control.update(6);
		control.update(8);
		control.update(4);
		expect(control.getReferenceValue()).toBe(5);
		expect(control.getValue()).toBe(-1);
	});

});
