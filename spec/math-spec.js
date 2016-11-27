describe("the math tools", function() {

	it("can invert a function", function() {
		var inversion = FunctionTools.invertReturnValue("z");
		expect(inversion[1]).toEqual("z");
		var inversion = FunctionTools.invertReturnValue("-z");
		expect(inversion[1]).toEqual("-z");
		inversion = FunctionTools.invertReturnValue("3 * a + 2");
		expect(inversion[1]).toEqual("(a - 2) / 3");
		inversion = FunctionTools.invertReturnValue(inversion[1]);
		expect(inversion[1]).toEqual("a * 3 + 2");
		inversion = FunctionTools.invertReturnValue("3 / a");
		expect(inversion[1]).toEqual("3 / a");
		inversion = FunctionTools.invertReturnValue("3 - t");
		expect(inversion[1]).toEqual("3 - t");
		inversion = FunctionTools.invertReturnValue("a / 3");
		expect(inversion[1]).toEqual("a * 3");
		inversion = FunctionTools.invertReturnValue(inversion[1]);
		expect(inversion[1]).toEqual("a / 3");
		inversion = FunctionTools.invertReturnValue("x - 3");
		expect(inversion[1]).toEqual("x + 3");
		inversion = FunctionTools.invertReturnValue(inversion[1]);
		expect(inversion[1]).toEqual("x - 3");
		//not defined (yet)
		inversion = FunctionTools.invertReturnValue("sqrt(x)");
		expect(inversion).toBeUndefined();
		inversion = FunctionTools.invertReturnValue("(3*x)+b");
		expect(inversion).toBeUndefined();
	});

	it("can determine whether a point is in a polygon", function() {
		var polygon = [{0:0,1:0}, {0:5,1:1}, {0:3,1:3}];
		var point1 = {0:3,1:2}; //inside
		var point2 = {0:3,1:0}; //outside
		var point3 = {0:4,1:2}; //on the line
		expect(PolygonTools.isPointInPolygon(polygon, point1)).toBeTruthy();
		expect(PolygonTools.isPointInPolygon(polygon, point2)).toBeFalsy();
		expect(PolygonTools.isPointInPolygon(polygon, point3)).toBeFalsy();
	});

	it("can find the centroid of a polygon", function() {
		var polygon = [{0:0,1:0}, {0:5,1:2}, {0:4,1:4}];
		expect(PolygonTools.getCentroid(polygon)).toEqual({0:3,1:2});
	});

	it("can find the minimum distance from an edge of a polygon", function() {
		var polygon = [{0:0,1:0}, {0:5,1:1}, {0:3,1:3}];
		var point1 = {0:3,1:2}; //inside
		var point2 = {0:2,1:1}; //inside
		var point3 = {0:4,1:2}; //on the line
		var centroid = PolygonTools.getCentroid(polygon);
		expect(PolygonTools.getMinDistanceFromEdge(polygon, point1)).toBeCloseTo(0.7071067811865476, 15);
		expect(PolygonTools.getMinDistanceFromEdge(polygon, centroid)).toBe(0.7844645405527361, 15);
		expect(PolygonTools.getMinDistanceFromEdge(polygon, point2)).toBe(0.588348405414552, 15);
		expect(PolygonTools.getMinDistanceFromEdge(polygon, point3)).toBe(0);
	});

	it("can determine how far a point is in a polygon", function() {
		var polygon = [{0:0,1:0}, {0:5,1:1}, {0:3,1:3}];
		var point1 = {0:3,1:2}; //inside
		var point2 = {0:3,1:0}; //outside
		var point3 = {0:4,1:2}; //on the line
		var centroid = PolygonTools.getCentroid(polygon);
		expect(PolygonTools.howFarIsPointInPolygon(polygon, centroid, point1)).toBeCloseTo(0.352092461065317, 15);
		expect(PolygonTools.howFarIsPointInPolygon(polygon, centroid, centroid)).toBe(1);
		expect(PolygonTools.howFarIsPointInPolygon(polygon, centroid, point2)).toBe(0);
		expect(PolygonTools.howFarIsPointInPolygon(polygon, centroid, point3)).toBe(0);
	});

	it("can return a polygon testing function string", function() {
		var polygon = [{0:0,1:0}, {0:5,1:1}, {0:3,1:3}];
		var point1 = {0:3,1:2}; //inside
		var point2 = {0:3,1:0}; //outside
		var point3 = {0:4,1:2}; //on the line
		var func = Function.apply(null, PolygonTools.getPolygonFunctionArgs(polygon));
		expect(func(point1[0], point1[1])).toBeTruthy();
		expect(func(point2[0], point2[1])).toBeFalsy();
		expect(func(point3[0], point3[1])).toBeFalsy();
		var centroid = PolygonTools.getCentroid(polygon);
		func = Function.apply(null, PolygonTools.getInterpolatedPolygonFunctionArgs(polygon));
		expect(func(point1[0], point1[1])).toBeCloseTo(0.352092461065317, 15);
		expect(func(centroid[0], centroid[1])).toBe(1);
		expect(func(point2[0], point2[1])).toBe(0);
		expect(func(point3[0], point3[1])).toBe(0);
	});

});
