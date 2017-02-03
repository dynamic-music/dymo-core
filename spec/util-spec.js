import { intersectSortedArrays, uniteSortedArrays, mergeSortedArrays, compareArrays } from '../src/util/arrays'
import * as _ from 'lodash'

describe("the utils", function() {

	it("have some optimized array functions", function() {
		var a = [[0,1],[2,3],[2,4],[3,1]];
		var b = [[0,1],[1,3],[2,4],[4,3]];
		var c = [[10,1],[2,3],[-2,4],[3,1]];

		var intersection = intersectSortedArrays(a, b);
		expect(_.isEqual(intersection, [[0,1],[2,4]])).toBe(true);

		var union = uniteSortedArrays(a, b);
		expect(_.isEqual(union, [[0,1],[0,1],[1,3],[2,3],[2,4],[2,4],[3,1],[4,3]])).toBe(true);

		var sorted = c.sort(compareArrays);
		expect(_.isEqual(sorted, [[-2,4],[2,3],[3,1],[10,1]])).toBe(true);

		var union = mergeSortedArrays([a,b,sorted]);
		expect(_.isEqual(union, [[-2,4],[0,1],[0,1],[1,3],[2,3],[2,3],[2,4],[2,4],[3,1],[3,1],[4,3],[10,1]])).toBe(true);

		/*var result = getPointsInBoundingBox([[0,1],[2,3]], [[0,0],[0,1],[0,2],[1,3],[2,4],[4,3]]);
		expect(math.deepEqual(result, [[0,1],[0,2],[1,3]])).toBe(true);*/
	});

});
