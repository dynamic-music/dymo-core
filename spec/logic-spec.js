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
		var x = lvar();
		var constraint = LogicTools.createConstraint("return a*b;");
		expect(run(constraint(x,2,3), x)).toEqual([6]);
		expect(run(constraint(9,x,3), x)).toEqual([3]);
		expect(run(constraint(9,2,x), x)).toEqual([4.5]);

		constraint = LogicTools.createConstraint("return a+b*c;");
		expect(run(constraint(x,2,3,4), x)).toEqual([14]);
		expect(run(constraint(14,x,3,4), x)).toEqual([2]);
		expect(run(constraint(14,2,x,4), x)).toEqual([3]);
		expect(run(constraint(14,2,3,x), x)).toEqual([4]);

		constraint = LogicTools.createConstraint("return (a+b)*c;");
		expect(run(constraint(x,2,3,4), x)).toEqual([20]);
		expect(run(constraint(20,x,3,4), x)).toEqual([2]);
		expect(run(constraint(20,2,x,4), x)).toEqual([3]);
		expect(run(constraint(20,2,3,x), x)).toEqual([4]);
	});

	it("is used in mapping functions", function(done) {
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1");
			DYMO_STORE.setFeature("dymo1", ONSET_FEATURE, 5);
			DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1);
			DYMO_STORE.addDymo("dymo2");
			DYMO_STORE.setFeature("dymo2", ONSET_FEATURE, 3);
			DYMO_STORE.setParameter("dymo2", AMPLITUDE, 1);
			var control = new Control("control1", SLIDER);
			control.updateValue(0.1);
			var mappingFunction = new DymoFunction(["a","b"], [control, ONSET_FEATURE], [MOBILE_CONTROL, FEATURE_TYPE], "return a * b;");
			var mapping = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE);

			//previously non-invertible function (see mapping-spec)
			expect(DYMO_STORE.findParameterValue("dymo1", AMPLITUDE)).toBe(0.5);
			//expect(DYMO_STORE.findParameterValue("dymo2", AMPLITUDE)).toBe(0.3);
			expect(control.getValue()).toBe(0.1);
			DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1.5);
			expect(control.getValue()).toBe(0.3); //UPDATES!!!
			mapping.disconnect();

			//previously even more non-invertible function
			DYMO_STORE.addDymo("dymo3");
			var paramUri = DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
			var mappingFunction = new DymoFunction(["a", "b"], [control, paramUri], [MOBILE_CONTROL, PARAMETER_TYPE], "return 5*a+b-1;");
			var mapping3 = new Mapping(mappingFunction, ["dymo1", "dymo2"], AMPLITUDE);
			expect(DYMO_STORE.findParameterValue("dymo3", AMPLITUDE)).toBe(1);

			DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1.5);
			var val = control.getValue();
			expect(val == 0.1 || val == 0.3).toBe(true);
			val = DYMO_STORE.findParameterValue("dymo3", AMPLITUDE);
			expect(val == 0 || val == 1).toBe(true);

			DYMO_STORE.setParameter("dymo3", AMPLITUDE, 0.3);
			val = control.getValue();
			expect(val == 0.1 || val == 0.3).toBe(true);
			val = DYMO_STORE.findParameterValue("dymo1", AMPLITUDE);
			expect(val == 0.8).toBe(true);
			/*console.log("UPDATE2")

			expect(control.getValue()).toBe(0.4);
			console.log("UPDATE3")
			DYMO_STORE.setParameter("dymo3", AMPLITUDE, 4);
			expect(control.getValue()).toBe(1);*/
			done();
		});
	});

});
