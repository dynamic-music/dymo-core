import 'isomorphic-fetch';
import * as _ from 'lodash';
import * as math from 'mathjs';
import * as u from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { DymoLoader } from '../../src/io/dymoloader';
import { ConstraintWriter } from '../../src/io/constraintwriter';
import { SERVER_ROOT } from './server';
import { Constraint } from '../../src/model/constraint';
import { Expression } from '../../src/model/expression';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../../src/model/variable';

describe("the expressions unit", function() {

  let store: DymoStore;
  let dymo1 = u.CONTEXT_URI+"dymo1";
  let dymo2 = u.CONTEXT_URI+"dymo2";
  let dymo3 = u.CONTEXT_URI+"dymo3";

  beforeEach(done => {
    store = new DymoStore();
    store.loadOntologies(SERVER_ROOT+'ontologies/')
      .then(() => {
        store.addDymo(dymo1);
        store.setFeature(dymo1, u.PITCH_FEATURE, 59);
        store.setParameter(dymo1, u.DURATION_RATIO, 2);
        store.setParameter(dymo1, u.AMPLITUDE, 0.8);
        store.addDymo(dymo2);
        store.setFeature(dymo2, u.PITCH_FEATURE, 61);
        store.setParameter(dymo2, u.DURATION_RATIO, 0.5);
        store.setParameter(dymo2, u.AMPLITUDE, 1);
        store.addDymo(dymo3);
        store.setFeature(dymo3, u.PITCH_FEATURE, 58);
        done();
      });
  });

  it("parses expressions and represents them ontologically", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let orig = '∀ x : Dymo, Pitch x > 60 => Amplitude x < 1 / Duration x';
    let exp1 = 'PitchFeature(x) > 60';
    let exp2 = 'Amplitude(x) < 1 / DurationRatio(x)';

    //for all x in exp1 make sure that exp2
    let vars = [new ExpressionVariable('x', u.DYMO, new Expression(exp1)), new ExpressionVariable('y', u.DYMO, new Expression(exp1.replace('x','y')))];
    let constraint = new Constraint(vars, new Expression(exp2));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    let loader = new DymoLoader(store);
    loader.createRenderingFromStore();
    let loaded = loader.getMappings();
    let loadedString = Object.keys(loaded).map(k => loaded[k].toString())[0];
    //console.log(loadedString);
    expect(loadedString).toEqual(constraint.toString());

    let store2 = new DymoStore();
    let vars2 = [new TypedVariable('x', u.DYMO)];
    constraint = new Constraint(vars2, new Expression('LevelFeature(x) == 1'));
    new ConstraintWriter(store2).addConstraint(renderingUri, constraint);
    store2.uriToJsonld(renderingUri)
    .then(j => expect(j).toEqual('{"@context":"http://tiny.cc/dymo-context","@id":"rendering1","constraint":{"@type":"ForAll","qBody":{"@type":"EqualTo","left":{"@type":"FunctionalTerm","tArgs":{"@id":"_:b0"},"tFunction":"LevelFeature"},"right":{"@type":"Constant","value":{"@type":"xsd:integer","@value":"1"}}},"vars":{"@id":"_:b0","@type":"Variable","varName":"x","varType":{"@id":"dy:Dymo"}}}}'))
    //.then(j => console.log(j))


  });

  it("can handle bound variables of different types", function() {

    let vari: BoundVariable = new TypedVariable('x', u.DYMO);
    expect(vari.getValues(store).length).toEqual(3);

    vari = new ExpressionVariable('x', u.DYMO, new Expression('x == "'+dymo2+'"'));
    expect(vari.getValues(store).length).toEqual(1);

    vari = new ExpressionVariable('x', u.DYMO, new Expression('PitchFeature(x) > 58'));
    expect(vari.getValues(store).length).toEqual(2);

    vari = new SetBasedVariable('x', [dymo1, dymo3]);
    expect(vari.getValues(store).length).toEqual(2);

  });

  it("can evaluate expressions", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let orig = '∀ x : Dymo, Pitch x > 60 => Amplitude x < 1 / Duration x';
    let exp1 = 'PitchFeature(x) > 60';
    let exp2 = 'Amplitude(x) < 1 / DurationRatio(x)';

    //for all x in exp1 make sure that exp2
    let vars = [new ExpressionVariable('x', u.DYMO, new Expression(exp1)), new ExpressionVariable('y', u.DYMO, new Expression(exp1.replace('x','y')))];
    let constraint = new Constraint(vars, new Expression(exp2));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    new DymoLoader(store).createRenderingFromStore();

    expect(vars[0].getValues(store)).toEqual([dymo2]);
    expect(constraint.evaluate(store)).toEqual([true]);

    //TODO THEN IMPLEMENT SELECTION CHANGE!! (VAR NOTIFIES CONSTRAINT IF CHANGED)

  });

  it("maintains expressions", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let exp = 'Amplitude(x) == 1 / DurationRatio(x)';

    //set it all up and check if it worked
    let vars = [new TypedVariable('x', u.DYMO)];
    let constraint = new Constraint(vars, new Expression(exp));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.8);
    expect(store.findParameterValue(dymo2, u.AMPLITUDE)).toEqual(1);
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toBeUndefined();

    //load constraints, start maintaining, and check if it worked
    let loader = new DymoLoader(store)
    loader.createRenderingFromStore();
    (<Constraint[]>_.values(loader.getMappings())).forEach(c => c.maintain(store));
    expect([0.5,0.8]).toContain(store.findParameterValue(dymo1, u.AMPLITUDE));
    expect([2,1.25]).toContain(store.findParameterValue(dymo1, u.DURATION_RATIO));
    expect([1,2]).toContain(store.findParameterValue(dymo2, u.AMPLITUDE));
    expect([1,0.5]).toContain(store.findParameterValue(dymo2, u.DURATION_RATIO));
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toBeUndefined();
    expect(store.findParameterValue(dymo3, u.DURATION_RATIO)).toBeUndefined();

    //check if system reacts to changed vars
    store.setParameter(dymo1, u.DURATION_RATIO, 1.6);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.625);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(1.6);
    expect([1,2]).toContain(store.findParameterValue(dymo2, u.AMPLITUDE));
    expect([1,0.5]).toContain(store.findParameterValue(dymo2, u.DURATION_RATIO));
    store.setParameter(dymo1, u.AMPLITUDE, 1.25);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(1.25);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(0.8);

  });

  it("can handle functional expressions", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let exp = 'Amplitude(x) == 1 / DurationRatio(x)';

    //set it all up and check if it worked
    let vars = [new TypedVariable('x', u.DYMO)];
    let constraint = new Constraint(vars, new Expression(exp, true));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    let loader = new DymoLoader(store)
    loader.createRenderingFromStore();
    (<Constraint[]>_.values(loader.getMappings())).forEach(c => c.maintain(store));
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.5);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(2);
    expect(store.findParameterValue(dymo2, u.AMPLITUDE)).toEqual(2);
    expect(store.findParameterValue(dymo2, u.DURATION_RATIO)).toEqual(0.5);
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toBeUndefined();
    expect(store.findParameterValue(dymo3, u.DURATION_RATIO)).toBeUndefined();

    //check if system reacts to changed vars
    store.setParameter(dymo1, u.DURATION_RATIO, 1.6);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.625);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(1.6);
    //should be unchanged
    store.setParameter(dymo1, u.AMPLITUDE, 1.25);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.625);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(1.6);

  });

  //TODO MAKE TEST WITH TWO CONSTRAINTS THAT BUILD A LOOP and solve problem!

  /*it("can handle dependency loops", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let exp = 'Amplitude(x) == 1 / DurationRatio(x) * Amplitude(x)';

    //set it all up and check if it worked
    let vars = [new TypedVariable('x', u.DYMO)];
    let constraint = new Constraint(vars, new Expression(exp, true));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    let loader = new DymoLoader(store)
    loader.createRenderingFromStore();
    (<Constraint[]>_.values(loader.getMappings())).forEach(c => c.maintain(store));
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.4);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(2);

    //check if system reacts to changed vars
    store.setParameter(dymo1, u.DURATION_RATIO, 1.6);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.25);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(1.6);
    //should be unchanged
    store.setParameter(dymo1, u.AMPLITUDE, 1.25);
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.25);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(1.6);

  });*/

  it("can handle controls", function() {

    let renderingUri = u.CONTEXT_URI+"rendering1";
    let exp = 'Amplitude(x) == 1 / DurationRatio(x) * y';
    let controlUri = u.CONTEXT_URI+'control1';
    store.addControl('test', u.SLIDER, controlUri);

    //set it all up and check if it worked
    let vars = [
      new TypedVariable('x', u.DYMO),
      new ExpressionVariable('y', u.SLIDER, new Expression('y == "'+controlUri+'"'))
    ];
    let constraint = new Constraint(vars, new Expression(exp));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    let loader = new DymoLoader(store)
    let control = loader.createRenderingFromStore()[1][controlUri];
    (<Constraint[]>_.values(loader.getMappings())).forEach(c => c.maintain(store));
    //console.log(_.values(loader.getMappings())[0].toString());
    expect(store.findParameterValue(dymo1, u.AMPLITUDE)).toEqual(0.8);
    expect(store.findParameterValue(dymo1, u.DURATION_RATIO)).toEqual(2);
    expect(store.findParameterValue(dymo2, u.AMPLITUDE)).toEqual(1);
    expect(store.findParameterValue(dymo2, u.DURATION_RATIO)).toEqual(0.5);
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toBeUndefined();
    expect(store.findParameterValue(dymo3, u.DURATION_RATIO)).toBeUndefined();

    control.updateValue(0.5);
    let amp1 = store.findParameterValue(dymo1, u.AMPLITUDE);
    let dur1 = store.findParameterValue(dymo1, u.DURATION_RATIO);
    expect([[0.25,2],[0.8,0.625]]).toContain([amp1,dur1]);
    expect(store.findParameterValue(dymo2, u.AMPLITUDE)).toEqual(1);
    expect(store.findParameterValue(dymo2, u.DURATION_RATIO)).toEqual(0.5);

    store.setParameter(dymo2, u.AMPLITUDE, 2);
    let amp2 = store.findParameterValue(dymo2, u.AMPLITUDE);
    let dur2 = store.findParameterValue(dymo2, u.DURATION_RATIO);
    expect([[2,0.25,0.5],[2,0.5,1]]).toContain([amp2,dur2,control.value]);

  });

});