import { SLIDER, ONSET_FEATURE, FEATURE_TYPE, PARAMETER_TYPE, MOBILE_CONTROL, AMPLITUDE, RAMP,
	AUTO_CONTROL_TRIGGER } from '../src/globals/uris'
import { GlobalVars } from '../src/globals/globals'
import { Mapping } from '../src/model/mapping'
import { DymoFunction } from '../src/model/function'
import { Control } from '../src/model/control'
import { DymoStore } from '../src/io/dymostore'

describe("a mapping", function() {

	var value = 0;
	var control = new Control("control1", SLIDER);
	var dymo1, dymo2, mapping;

	beforeEach(function(done) {
		GlobalVars.DYMO_STORE = null;
		GlobalVars.DYMO_STORE = new DymoStore(function(){
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.setFeature("dymo1", ONSET_FEATURE, 5);
			GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1);
			GlobalVars.DYMO_STORE.addDymo("dymo2");
			GlobalVars.DYMO_STORE.setFeature("dymo2", ONSET_FEATURE, 3);
			GlobalVars.DYMO_STORE.setParameter("dymo2", AMPLITUDE, 1);
			var mappingFunction = new DymoFunction(["a","b"], [control, ONSET_FEATURE], [MOBILE_CONTROL, FEATURE_TYPE], "return a * b;");
			mapping = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE);
			done();
		});
	});

	it("updates a dymo parameter", function() {
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(1);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBe(1);
		control.updateValue(0.3);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(1.5);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBeCloseTo(0.9, 10);
		control.updateValue(0.1);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBeCloseTo(0.3, 10);
	});

	it("can map from parameters to other parameters", function() {
		var highLevelParamUri = GlobalVars.DYMO_STORE.setParameter("dymo1", "high-level", 1);
		var mappingFunction = new DymoFunction(["a","b"], [highLevelParamUri, ONSET_FEATURE], [PARAMETER_TYPE, FEATURE_TYPE], "return a * b;");
		var mapping2 = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(5);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBe(3);
		GlobalVars.DYMO_STORE.setParameter("dymo1", "high-level", 0.3);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(1.5);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBeCloseTo(0.9, 10);
		GlobalVars.DYMO_STORE.setParameter("dymo1", "high-level", 0.1);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBeCloseTo(0.3, 10);
	});

	it("updates a control parameter", function() {
		GlobalVars.DYMO_STORE.addControl("control2", SLIDER);
		var control2 = new Control("control2", SLIDER);
		var rampUri = GlobalVars.DYMO_STORE.addControl(undefined, RAMP);
		var mappingFunction = new DymoFunction(["a"], [control2], [MOBILE_CONTROL], "return a;");
		var mapping2 = new Mapping(mappingFunction, [rampUri], AUTO_CONTROL_TRIGGER);
		control2.updateValue(1);
		expect(GlobalVars.DYMO_STORE.findParameterValue(rampUri, AUTO_CONTROL_TRIGGER)).toBe(1);
		control2.updateValue(0);
		expect(GlobalVars.DYMO_STORE.findParameterValue(rampUri, AUTO_CONTROL_TRIGGER)).toBe(0);
	});

	it("updates a control with inverse if possible", function() {
		mapping.disconnect();
		var mappingFunction = new DymoFunction(["a", "b"], [control, ONSET_FEATURE], [MOBILE_CONTROL, FEATURE_TYPE], "return 5*a+b*a-1;");
		new Mapping(mappingFunction, ["dymo1"], AMPLITUDE);
		control.updateValue(0.15);
		//currently non-invertible function
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
		expect(control.getValue()).toBe(0.15);
		GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1.5);
		expect(control.getValue()).toBe(0.15); //doesn't update
		//currently invertible function
		GlobalVars.DYMO_STORE.addDymo("dymo3");
		GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
		mappingFunction = new DymoFunction(["a"], [control], [MOBILE_CONTROL], "return 5*a-1;");
		new Mapping(mappingFunction, ["dymo3"], AMPLITUDE);
		control.updateValue(0.1);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo3", AMPLITUDE)).toBe(-0.5);
		control.updateValue(0.3);
		expect(GlobalVars.DYMO_STORE.findParameterValue("dymo3", AMPLITUDE)).toBe(0.5);
		GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
		expect(control.getValue()).toBe(0.4);
		GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 4);
		expect(control.getValue()).toBe(1);
	});

	it("requests a value", function() {
		expect(mapping.requestValue("dymo1")).toBe(5);
		/*expect(mapping.requestValue(dymo1)).toBe(10);
		expect(mapping.requestValue(dymo2)).toBe(9);
		expect(mapping.requestValue(dymo2)).toBe(12);
		expect(mapping.requestValue(dymo2)).toBe(15);*/
	});

});
