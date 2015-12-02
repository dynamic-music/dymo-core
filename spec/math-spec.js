describe("the math tools", function() {
	
	it("can invert a function", function() {
		var inversion = new FunctionInverter().invert("z");
		expect(inversion).toEqual("z");
		inversion = new FunctionInverter().invert("3 * a + 2");
		expect(inversion).toEqual("(a - 2) / 3");
		inversion = new FunctionInverter().invert(inversion);
		expect(inversion).toEqual("a * 3 + 2");
		inversion = new FunctionInverter().invert("3 / a");
		expect(inversion).toEqual("3 / a");
		inversion = new FunctionInverter().invert("3 - t");
		expect(inversion).toEqual("3 - t");
		inversion = new FunctionInverter().invert("a / 3");
		expect(inversion).toEqual("a * 3");
		inversion = new FunctionInverter().invert(inversion);
		expect(inversion).toEqual("a / 3");
		inversion = new FunctionInverter().invert("x - 3");
		expect(inversion).toEqual("x + 3");
		inversion = new FunctionInverter().invert(inversion);
		expect(inversion).toEqual("x - 3");
		//not defined (yet)
		inversion = new FunctionInverter().invert("sqrt(x)");
		expect(inversion).toBeUndefined();
		inversion = new FunctionInverter().invert("(3*x)+b");
		expect(inversion).toBeUndefined();
	});
	
});