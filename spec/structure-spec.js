import { DymoStore } from '../src/io/dymostore'
import { GlobalVars } from '../src/globals/globals'
import { ONSET_FEATURE, PITCH_FEATURE } from '../src/globals/uris'
import { Similarity } from '../src/generator/similarity'
import { Cosiatec } from '../src/generator/cosiatec'
import * as math from 'mathjs'

describe("a structure induction algorithm", function() {

	beforeEach(function(done) {
		//(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
		GlobalVars.DYMO_STORE = new DymoStore(function(){
			//example from figure 12 in meredith-lemström-wiggins 2003
			//dimensions reversed due to order reversing in easystore
			//points (3,4), (4,5) added to test iterative cosiatec
			GlobalVars.DYMO_STORE.addDymo("dymo1");
			GlobalVars.DYMO_STORE.addDymo("a", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("b", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("c", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("d", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("e", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("f", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("g", "dymo1");
			GlobalVars.DYMO_STORE.addDymo("h", "dymo1");
			GlobalVars.DYMO_STORE.setFeature("a", ONSET_FEATURE, 1);
			GlobalVars.DYMO_STORE.setFeature("a", PITCH_FEATURE, 1);
			GlobalVars.DYMO_STORE.setFeature("b", ONSET_FEATURE, 3);
			GlobalVars.DYMO_STORE.setFeature("b", PITCH_FEATURE, 1);
			GlobalVars.DYMO_STORE.setFeature("c", ONSET_FEATURE, 1);
			GlobalVars.DYMO_STORE.setFeature("c", PITCH_FEATURE, 2);
			GlobalVars.DYMO_STORE.setFeature("d", ONSET_FEATURE, 2);
			GlobalVars.DYMO_STORE.setFeature("d", PITCH_FEATURE, 2);
			GlobalVars.DYMO_STORE.setFeature("e", ONSET_FEATURE, 3);
			GlobalVars.DYMO_STORE.setFeature("e", PITCH_FEATURE, 2);
			GlobalVars.DYMO_STORE.setFeature("f", ONSET_FEATURE, 2);
			GlobalVars.DYMO_STORE.setFeature("f", PITCH_FEATURE, 3);
			GlobalVars.DYMO_STORE.setFeature("g", ONSET_FEATURE, 3);
			GlobalVars.DYMO_STORE.setFeature("g", PITCH_FEATURE, 4);
			GlobalVars.DYMO_STORE.setFeature("h", ONSET_FEATURE, 4);
			GlobalVars.DYMO_STORE.setFeature("h", PITCH_FEATURE, 5);
			done();
		});
	});

	it("adds a hierarchy to a dymo", function() {

	});

	it("can do lots of sia-related stuff", function() {
		var surface = Similarity.getAllParts(["dymo1"], GlobalVars.DYMO_STORE);
	  var vectors = Similarity.toVectors(surface, GlobalVars.DYMO_STORE);

		var patterns = Cosiatec.getSiaPatterns(vectors);
		//console.log(JSON.stringify(patterns))
		expect(Object.keys(patterns).length).toBe(17);
		expect(patterns["[1,0]"].length).toBe(3);
		patterns = Object.keys(patterns).map(key => patterns[key]);

		var compactness = patterns.map(p => Cosiatec.getCompactness(p, vectors));
		expect(compactness).toEqual([ 0.25, 0.2, 0.2, 0.125, 0.2, 0.14285714285714285, 0.125, 0.125, 0.125, 0.3333333333333333, 0.3333333333333333, 0.125, 0.125, 0.3333333333333333, 0.125, 0.125, 0.125 ]);

		var flompactness = patterns.map(p => Cosiatec.getFlompactness(p, vectors));
		expect(flompactness).toEqual([ 0.3333333333333333, 0.25, 0.25, 0.125, 0.3333333333333333, 0.25, 0.125, 0.125, 0.125, 0.5, 0.5, 0.125, 0.125, 0.5, 0.125, 0.125, 0.125 ]);

		var minimized = Cosiatec.minimizePattern(patterns[5], vectors);
		expect(patterns[5].length).toBe(4);
		expect(minimized.length).toBe(3);
		expect(Cosiatec.getFlompactness(patterns[5], vectors)).toBe(0.25);
		expect(Cosiatec.getFlompactness(minimized, vectors)).toBe(0.5);

		var occurrences = Cosiatec.getSiatecOccurrences(vectors, patterns);
		expect(Object.keys(occurrences).length).toBe(2);
		expect(occurrences[0][2].length).toBe(3);
		//console.log(JSON.stringify(occurrences))

		patterns = Cosiatec.getCosiatecPatterns(vectors);
		expect(JSON.stringify(patterns)).toEqual("[[[[1,1],[2,2]],[[0,0],[1,0],[2,1],[3,2]]],[[[1,3]],[[0,0],[1,0]]]]");

		patterns = Cosiatec.getOverlappingCosiatecPatterns(vectors);
		expect(patterns.length).toBe(4);
	});

	it("has some optimized functions", function() {
		var a = [[0,1],[2,3],[2,4],[3,1]];
		var b = [[0,1],[1,3],[2,4],[4,3]];
		var c = [[10,1],[2,3],[-2,4],[3,1]];

		var intersection = Cosiatec.intersectSortedArrays(a, b);
		expect(math.deepEqual(intersection, [[0,1],[2,4]])).toBe(true);

		var union = Cosiatec.uniteSortedArrays(a, b);
		expect(math.deepEqual(union, [[0,1],[0,1],[1,3],[2,3],[2,4],[2,4],[3,1],[4,3]])).toBe(true);

		var sorted = c.sort(Cosiatec.compareArrays);
		expect(math.deepEqual(sorted, [[-2,4],[2,3],[3,1],[10,1]])).toBe(true);

		var union = Cosiatec.mergeSortedArrays([a,b,sorted]);
		expect(math.deepEqual(union, [[-2,4],[0,1],[0,1],[1,3],[2,3],[2,3],[2,4],[2,4],[3,1],[3,1],[4,3],[10,1]])).toBe(true);

		var result = Cosiatec.getPointsInBoundingBox([[0,1],[2,3]], [[0,0],[0,1],[0,2],[1,3],[2,4],[4,3]]);
		expect(math.deepEqual(result, [[0,1],[0,2],[1,3]])).toBe(true);
	});

});
