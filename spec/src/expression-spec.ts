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
import { Control } from '../../src/model/control';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../../src/model/variable';
import { forAll } from '../../src/generator/expression-generator';

describe('fluent builder syntax', () => {
  it('produces valid string', () => {
    const expected = `∀ x : FAKE_URI, PRED(x) == 1 => ∀ c in ["A_URI","B_URI"] => SomeFunction(x) == c`;
    const built = forAll('x')
      .ofTypeWith('FAKE_URI', 'PRED(x) == 1')
      .forAll('c')
      .in('A_URI', 'B_URI')
      .assert('SomeFunction(x) == c');
    expect(built.toString()).toBe(expected);
  });

  it('builds valid expression internally', () => {
    const store = new DymoStore();
    let controlUri = store.addControl("control1", u.SLIDER);
    const control = new Control(controlUri, "control1", u.SLIDER, store);
    let vars = [
      new SetBasedVariable('c', [controlUri]),
      new TypedVariable('d', u.DYMO)
    ];
    const c = new Constraint(
      vars,
      new Expression('Amplitude(d) == c * OnsetFeature(d)',
      true)
    );
    const exp = forAll('c')
      .in(controlUri)
      .forAll('d')
      .ofType(u.DYMO)
      .assert('Amplitude(d) == c * OnsetFeature(d)')
    expect(exp.toString()).toBe(c.toString());
  })
});

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
    let loaded = new DymoLoader(store).loadFromStore().constraints;
    let loadedString = Object.keys(loaded).map(k => loaded[k].toString())[0];
    //console.log(loadedString);
    expect(loadedString).toEqual(constraint.toString());

    let store2 = new DymoStore();
    let vars2 = [new TypedVariable('x', u.DYMO)];
    constraint = new Constraint(vars2, new Expression('LevelFeature(x) == 1'));
    new ConstraintWriter(store2).addConstraint(renderingUri, constraint);
    store2.uriToJsonld(renderingUri)
    .then(j => expect(j).toEqual('{"@context":"http://tiny.cc/dymo-context","@id":"rendering1","constraint":{"@type":"ForAll","body":{"@type":"EqualTo","left":{"@type":"FunctionalTerm","args":{"@id":"_:b0"},"func":{"@type":"NamedFunction","name":"LevelFeature"}},"right":{"@type":"Constant","value":{"@type":"xsd:integer","@value":"1"}}},"vars":{"@id":"_:b0","@type":"Variable","varName":"x","varType":{"@id":"dy:Dymo"}}}}'))
    //.then(j => console.log(j))

  });



  it("handles conditionals and functions with accessors", function() {
    let store = new DymoStore();
    let renderingUri = u.CONTEXT_URI+"rendering1";
    let constraint = forAll("d1").in(dymo1).forAll("d2").in(dymo2)
      .assert("Amplitude(d1) == (Amplitude(d2) > 0.5 ? Amplitude(d2) : 0)");
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    store.uriToJsonld(renderingUri)
      .then(j => {
        expect(j).toEqual(`{"@context":"http://tiny.cc/dymo-context","@id":"rendering1","constraint":{"@type":"ForAll","body":{"@type":"ForAll","body":{"@type":"EqualTo","directed":{"@type":"xsd:boolean","@value":"false"},"left":{"@type":"FunctionalTerm","args":{"@id":"_:b0"},"func":{"@type":"NamedFunction","name":"Amplitude"}},"right":{"@type":"Conditional","alternative":{"@type":"Constant","value":{"@type":"xsd:integer","@value":"0"}},"antecedent":{"@type":"GreaterThan","left":{"@type":"FunctionalTerm","args":{"@id":"_:b1"},"func":{"@type":"NamedFunction","name":"Amplitude"}},"right":{"@type":"Constant","value":{"@type":"xsd:double","@value":"0.5"}}},"consequent":{"@type":"FunctionalTerm","args":{"@id":"_:b1"},"func":{"@type":"NamedFunction","name":"Amplitude"}}}},"vars":{"@id":"_:b1","@type":"Variable","varName":"d2","varValue":{"@id":"dymo2"}}},"vars":{"@id":"_:b0","@type":"Variable","varName":"d1","varValue":{"@id":"dymo1"}}}}`);
      });
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
    new DymoLoader(store).loadFromStore();

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
    new DymoLoader(store).loadFromStore();
    expect([0.5,0.8]).toContain(store.findParameterValue(dymo1, u.AMPLITUDE));
    expect([2,1.25]).toContain(store.findParameterValue(dymo1, u.DURATION_RATIO));
    expect([1,2]).toContain(store.findParameterValue(dymo2, u.AMPLITUDE));
    expect([1,0.5]).toContain(store.findParameterValue(dymo2, u.DURATION_RATIO));
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toEqual(1); //automatic init with standard values!!
    expect(store.findParameterValue(dymo3, u.DURATION_RATIO)).toEqual(1); //automatic init with standard values!!

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
      new SetBasedVariable('y', [controlUri])
    ];
    let constraint = new Constraint(vars, new Expression(exp, true));
    new ConstraintWriter(store).addConstraint(renderingUri, constraint);
    let control = new DymoLoader(store).loadFromStore().controls[0];
    expect([0.5,0.8]).toContain(store.findParameterValue(dymo1, u.AMPLITUDE));
    expect([2,1.25]).toContain(store.findParameterValue(dymo1, u.DURATION_RATIO));
    expect([1,2]).toContain(store.findParameterValue(dymo2, u.AMPLITUDE));
    expect([1,0.5]).toContain(store.findParameterValue(dymo2, u.DURATION_RATIO));
    expect(store.findParameterValue(dymo3, u.AMPLITUDE)).toEqual(1); //automatic init with standard values!!
    expect(store.findParameterValue(dymo3, u.DURATION_RATIO)).toEqual(1); //automatic init with standard values!!

    control.updateValue(0.5);
    let amp1 = store.findParameterValue(dymo1, u.AMPLITUDE);
    let dur1 = store.findParameterValue(dymo1, u.DURATION_RATIO);
    expect([[0.25,2],[0.8,0.625],[ 0.8, 2 ]]).toContain([amp1,dur1]);
    expect(store.findParameterValue(dymo2, u.AMPLITUDE)).toEqual(1);
    expect(store.findParameterValue(dymo2, u.DURATION_RATIO)).toEqual(0.5);

    //constraint is directional, so no update
    store.setParameter(dymo2, u.AMPLITUDE, 2);
    let amp2 = store.findParameterValue(dymo2, u.AMPLITUDE);
    let dur2 = store.findParameterValue(dymo2, u.DURATION_RATIO);
    expect([[ 2, 0.5, 0.5 ]]).toContain([amp2,dur2,control.getValue()]);
    constraint.stopMaintaining();

    //try with non-directional constraint for craziness
    new Constraint(vars, new Expression(exp, false)).maintain(store);
    store.setParameter(dymo2, u.AMPLITUDE, 2);
    amp2 = store.findParameterValue(dymo2, u.AMPLITUDE);
    dur2 = store.findParameterValue(dymo2, u.DURATION_RATIO);
    //expect([[2,0.25,0.5],[2,0.5,1],[ 0,0,7.884458e-7],['Infinity',0,Infinity],[ 0.001953125,512,2],['Infinity',0,1e-12]]).toContain([amp2,dur2,control.value]);

  });

});