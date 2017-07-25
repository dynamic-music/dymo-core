import 'isomorphic-fetch';
import * as logic from 'logicjs';
import { LogicTools } from '../../src/math/logictools';
import { DymoStore } from '../../src/io/dymostore';
import { DymoFunction } from '../../src/model/function';
import { Control } from '../../src/model/control';
import { Mapping } from '../../src/model/mapping';
import { GlobalVars } from '../../src/globals/globals';
import { ONSET_FEATURE, AMPLITUDE, SLIDER, MOBILE_CONTROL, FEATURE_TYPE, PARAMETER_TYPE } from '../../src/globals/uris';
import { SERVER_ROOT } from './server';

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
		expect(LogicTools.solveConstraint(constraint, ["",2,3], 0)).toEqual(6);
		expect(LogicTools.solveConstraint(constraint, [9,"",3], 1)).toEqual(3);
		expect(LogicTools.solveConstraint(constraint, [9,2,""], 2)).toEqual(4.5);

		constraint = LogicTools.createConstraint("return a+b*c;");
		expect(LogicTools.solveConstraint(constraint, ["",2,3,4], 0)).toEqual(14);
		expect(LogicTools.solveConstraint(constraint, [14,"",3,4], 1)).toEqual(2);
		expect(LogicTools.solveConstraint(constraint, [14,2,"",4], 2)).toEqual(3);
		expect(LogicTools.solveConstraint(constraint, [14,2,3,""], 3)).toEqual(4);

		constraint = LogicTools.createConstraint("return (a+b)*c;");
		expect(LogicTools.solveConstraint(constraint, ["",2,3,4], 0)).toEqual(20);
		expect(LogicTools.solveConstraint(constraint, [20,"",3,4], 1)).toEqual(2);
		expect(LogicTools.solveConstraint(constraint, [20,2,"",4], 2)).toEqual(3);
		expect(LogicTools.solveConstraint(constraint, [20,2,3,""], 3)).toEqual(4);
	});

	it("is used in mapping functions", function(done) {
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.setFeature("dymo1", ONSET_FEATURE, 5);
			GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1);
			GlobalVars.DYMO_STORE.addDymo("dymo2");
			GlobalVars.DYMO_STORE.setFeature("dymo2", ONSET_FEATURE, 3);
			GlobalVars.DYMO_STORE.setParameter("dymo2", AMPLITUDE, 1);
			var control = new Control("c1", "Slider1", SLIDER, GlobalVars.DYMO_STORE);
			control.updateValue(0.1);
			var mappingFunction = new DymoFunction(["a","b"], [control, ONSET_FEATURE], [MOBILE_CONTROL, FEATURE_TYPE], "return a * b;", false);
			var mapping = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE, false);

			//previously non-invertible function (see mapping-spec)
			expect(GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
			//expect(GlobalVars.DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBe(0.3);
			expect(control.getValue()).toBe(0.1);
			GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1.5);
			expect(control.getValue()).toBe(0.3); //UPDATES!!!
			mapping.disconnect();

			//previously even more non-invertible function
			GlobalVars.DYMO_STORE.addDymo("dymo3");
			var paramUri = GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
			var mappingFunction = new DymoFunction(["a","b"], [control, paramUri], [MOBILE_CONTROL, PARAMETER_TYPE], "return 5*a+b-1;", false);
			var mapping3 = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE, false);
			expect(GlobalVars.DYMO_STORE.findParameterValue("dymo3", AMPLITUDE)).toBe(1);

			GlobalVars.DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1.5);
			var val = control.getValue();
			expect(val == 0.1 || val == 0.3).toBe(true);
			val = GlobalVars.DYMO_STORE.findParameterValue("dymo3", AMPLITUDE);
			expect(val == 0 || val == 1).toBe(true);

			GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 0.3);
			val = control.getValue();
			expect(val == 0.1 || val == 0.3).toBe(true);
			val = GlobalVars.DYMO_STORE.findParameterValue("dymo1", AMPLITUDE);
			expect(val == 0.8).toBe(true);
			/*console.log("UPDATE2")

			expect(control.getValue()).toBe(0.4);
			console.log("UPDATE3")
			GlobalVars.DYMO_STORE.setParameter("dymo3", AMPLITUDE, 4);
			expect(control.getValue()).toBe(1);*/
			done();
		});
	});

});
