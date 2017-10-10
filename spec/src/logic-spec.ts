import 'isomorphic-fetch';
import * as logic from 'logicjs';
import { LogicTools } from '../../src/math/logictools';
import { DymoStore } from '../../src/io/dymostore';
import { Control } from '../../src/model/control';
import { GlobalVars } from '../../src/globals/globals';
import { ONSET_FEATURE, AMPLITUDE, SLIDER, MOBILE_CONTROL, FEATURE_TYPE, PARAMETER_TYPE, DYMO } from '../../src/globals/uris';
import { SERVER_ROOT } from './server';
import { Constraint } from '../../src/model/constraint';
import { Expression } from '../../src/model/expression';
import { BoundVariable, TypedVariable, ExpressionVariable, SetBasedVariable } from '../../src/model/variable';

describe("the logic unit", function() {

  var or = logic.or,
    and = logic.and,
    eq = logic.eq,
    run = logic.run,
    lvar = logic.lvar,
    between = logic.between,
    add = logic.add,
    sub = logic.sub,
    mul = logic.mul,
    div = logic.div;

  it("uses logicjs", function() {

    var constraint = function(x,y) {
      return or(
        and(eq(x,2), eq(y,3)),
        and(eq(x,y), eq(y,'dog'))
      );
    }

    var x = lvar(),
      y = lvar();

    //runs goal asking for the possible values of x and y
    expect(run(constraint(x,y), x)).toEqual([2, 'dog']);
    expect(run(constraint(x,y), y)).toEqual([3, 'dog']);
    expect(run(constraint(2,y), y)).toEqual([3]);
    expect(run(constraint(x,'dog'), x)).toEqual(['dog']);
    expect(run(constraint(x,y), [x,y])).toEqual([[2,3], ['dog','dog']]);
  });

  it("can reason over equation constraints", function() {
    var constraint = LogicTools.createConstraint("return a*b;");
    expect(LogicTools.solveConstraint(constraint, ["",2,3], 0)[0]).toEqual(6);
    expect(LogicTools.solveConstraint(constraint, [9,"",3], 1)[0]).toEqual(3);
    expect(LogicTools.solveConstraint(constraint, [9,2,""], 2)[0]).toEqual(4.5);

    constraint = LogicTools.createConstraint("return a+b*c;");
    expect(LogicTools.solveConstraint(constraint, ["",2,3,4], 0)[0]).toEqual(14);
    expect(LogicTools.solveConstraint(constraint, [14,"",3,4], 1)[0]).toEqual(2);
    expect(LogicTools.solveConstraint(constraint, [14,2,"",4], 2)[0]).toEqual(3);
    expect(LogicTools.solveConstraint(constraint, [14,2,3,""], 3)[0]).toEqual(4);

    constraint = LogicTools.createConstraint("return (a+b)*c;");
    expect(LogicTools.solveConstraint(constraint, ["",2,3,4], 0)[0]).toEqual(20);
    expect(LogicTools.solveConstraint(constraint, [20,"",3,4], 1)[0]).toEqual(2);
    expect(LogicTools.solveConstraint(constraint, [20,2,"",4], 2)[0]).toEqual(3);
    expect(LogicTools.solveConstraint(constraint, [20,2,3,""], 3)[0]).toEqual(4);
  });

  it("is used in constraints", function(done) {
    let store = new DymoStore();
    store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
      store.addDymo("dymo1");
      store.setFeature("dymo1", ONSET_FEATURE, 5);
      store.setParameter("dymo1", AMPLITUDE, 1);
      store.addDymo("dymo2");
      store.setFeature("dymo2", ONSET_FEATURE, 3);
      store.setParameter("dymo2", AMPLITUDE, 1);
      var control = new Control("c1", "Slider1", SLIDER, store);

      //previously non-invertible function (see constraint-spec)
      let vars = [new SetBasedVariable('c', [control.getUri()]), new TypedVariable('d', DYMO)];
      let constraint = new Constraint(vars, new Expression('Amplitude(d) == c * OnsetFeature(d)'))
      constraint.maintain(store);

      control.updateValue(0.1);
      expect(store.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
      expect(store.findParameterValue("dymo2", AMPLITUDE)).toBe(0.3);
      expect(control.getValue()).toBe(0.1);

      store.setParameter("dymo1", AMPLITUDE, 1.5);
      expect(control.getValue()).toBe(0.3); //UPDATES!!!
      expect(store.findParameterValue("dymo2", AMPLITUDE)).toBe(0.9); //AND EVEN THIS!
      constraint.stopMaintaining();

      //previously even more non-invertible function
      store.addDymo("dymo3");
      var paramUri = store.setParameter("dymo3", AMPLITUDE, 1);
      vars = [
        new SetBasedVariable('c', [control.getUri()]),
        new SetBasedVariable('d', ["dymo1", "dymo2"]),
        new SetBasedVariable('a', [paramUri])
      ];
      constraint = new Constraint(vars, new Expression('Amplitude(d) == 5*c + a-1', true))
      constraint.maintain(store);
      expect(store.findParameterValue("dymo3", AMPLITUDE)).toBe(1);

      store.setParameter("dymo1", AMPLITUDE, 1.5);
      var val = control.getValue();
      expect(val == 0.1 || val == 0.3).toBe(true);
      val = store.findParameterValue("dymo3", AMPLITUDE);
      expect(val == 0 || val == 1).toBe(true);

      store.setParameter("dymo3", AMPLITUDE, 0.3);
      val = control.getValue();
      expect(val == 0.1 || val == 0.3).toBe(true);
      val = store.findParameterValue("dymo1", AMPLITUDE);
      expect(val == 0.8).toBe(true);

      done();
    });
  });

});
