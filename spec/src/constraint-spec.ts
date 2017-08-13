import 'isomorphic-fetch';
import * as u from '../../src/globals/uris';
import { GlobalVars } from '../../src/globals/globals';
import { Control } from '../../src/model/control';
import { DymoStore } from '../../src/io/dymostore';
import { SERVER_ROOT } from './server';
import { Constraint } from '../../src/model/constraint';
import { Expression } from '../../src/model/expression';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../../src/model/variable';

describe("a constraint", function() {

  let store: DymoStore;
  var value = 0;
  var control;
  var dymo1, dymo2;
  let constraint: Constraint;

  beforeEach(function(done) {
    store = new DymoStore();
    store.loadOntologies(SERVER_ROOT+'ontologies/')
    .then(() => {
      store.addDymo("dymo1");
      store.setFeature("dymo1", u.ONSET_FEATURE, 5);
      store.setParameter("dymo1", u.AMPLITUDE, 1);
      store.addDymo("dymo2");
      store.setFeature("dymo2", u.ONSET_FEATURE, 3);
      store.setParameter("dymo2", u.AMPLITUDE, 1);
      let controlUri = store.addControl("control1", u.SLIDER);
      control = new Control(controlUri, "control1", u.SLIDER, store);
      let vars = [new SetBasedVariable('c', [controlUri]), new TypedVariable('d', u.DYMO)];
      constraint = new Constraint(vars, new Expression('Amplitude(d) == c * OnsetFeature(d)', true));
      constraint.maintain(store);
      done();
    });
  });

  it("updates a dymo parameter", function() {
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(1);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBe(1);
    control.updateValue(0.3);
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(1.5);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBeCloseTo(0.9, 10);
    control.updateValue(0.1);
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(0.5);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBeCloseTo(0.3, 10);
  });

  it("can map from parameters to other parameters", function() {
    var highLevelParamUri = store.setParameter("dymo1", "high-level", 1);
    let vars = [new SetBasedVariable('p', [highLevelParamUri]), new TypedVariable('d', u.DYMO)];
    new Constraint(vars, new Expression('Amplitude(d) == p * OnsetFeature(d)', true)).maintain(store);
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(5);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBe(3);
    store.setParameter("dymo1", "high-level", 0.3);
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(1.5);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBeCloseTo(0.9, 10);
    store.setParameter("dymo1", "high-level", 0.1);
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(0.5);
    expect(store.findParameterValue("dymo2", u.AMPLITUDE)).toBeCloseTo(0.3, 10);
  });

  it("updates a control parameter", function() {
    let controlUri = store.addControl("control2", u.SLIDER);
    var control2 = new Control(controlUri, "control2", u.SLIDER, store);
    var rampUri = store.addControl(undefined, u.RAMP);
    store.setControlParam(rampUri, u.AUTO_CONTROL_TRIGGER, 1);
    let vars = [new SetBasedVariable('c', [controlUri]), new SetBasedVariable('r', [rampUri])];
    new Constraint(vars, new Expression('AutoControlTrigger(r) == c', true)).maintain(store);
    control2.updateValue(1);
    //store.logData()
    expect(store.findControlParamValue(rampUri, u.AUTO_CONTROL_TRIGGER)).toBe(1);
    control2.updateValue(0);
    expect(store.findControlParamValue(rampUri, u.AUTO_CONTROL_TRIGGER)).toBe(0);
  });

  it("updates a control with inverse if possible", function() {
    constraint.stopMaintaining();
    let vars = [new SetBasedVariable('c', [control.getUri()]), new SetBasedVariable('d', ["dymo1", "dymo2"])];
    constraint = new Constraint(vars, new Expression('Amplitude(d) == 5*c + OnsetFeature(d)*c-1', true))
    constraint.maintain(store);
    control.updateValue(0.15);
    //currently non-invertible function
    expect(store.findParameterValue("dymo1", u.AMPLITUDE)).toBe(0.5);
    expect(control.getValue()).toBe(0.15);
    store.setParameter("dymo1", u.AMPLITUDE, 1.5);
    expect(control.getValue()).toBe(0.15); //doesn't update
    constraint.stopMaintaining();

    //currently invertible function
    store.addDymo("dymo3");
    store.setParameter("dymo3", u.AMPLITUDE, 1);
    vars = [new SetBasedVariable('c', [control.getUri()]), new SetBasedVariable('d', ["dymo3"])];
    new Constraint(vars, new Expression('Amplitude(d) == 5*c-1')).maintain(store);
    control.updateValue(0.1);
    expect(store.findParameterValue("dymo3", u.AMPLITUDE)).toBe(-0.5);
    control.updateValue(0.3);
    expect(store.findParameterValue("dymo3", u.AMPLITUDE)).toBe(0.5);
    store.setParameter("dymo3", u.AMPLITUDE, 1);
    expect(control.getValue()).toBe(0.4);
    store.setParameter("dymo3", u.AMPLITUDE, 4);
    expect(control.getValue()).toBe(1);
  });

});
