import { DymoStore } from '../src/io/dymostore'
import { GlobalVars } from '../src/globals/globals'
import { ONSET_FEATURE, PITCH_FEATURE } from '../src/globals/uris'
import { DymoStructureInducer } from '../src/generator/dymo-structure'
import { Siatec } from '../src/structure/siatec'
import { Cosiatec } from '../src/structure/cosiatec'
import { Quantizer, getSummarize, getRound, getOrder } from '../src/structure/quantizer'
import { HEURISTICS, getCompactness, getFlompactness, getPointsInBoundingBox } from '../src/structure/heuristics'
import * as _ from 'lodash'

describe("a structure induction algorithm", function() {

	var vectors;

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
			var surface = DymoStructureInducer.getAllParts(["dymo1"], GlobalVars.DYMO_STORE);
		  vectors = DymoStructureInducer.toVectors(surface, GlobalVars.DYMO_STORE);
			done();
		});
	});

	it("adds a hierarchy to a dymo", function() {

	});

	it("can find repeating geometric patterns", function() {
		var siatec = new Siatec(vectors, HEURISTICS.COMPACTNESS2, false);
		var patterns = siatec.getPatterns();

		expect(patterns.length).toBe(17);
		expect(patterns[5].length).toBe(4);

		var occurrences = siatec.getOccurrences();
		expect(occurrences.length).toBe(17);
		expect(occurrences[2].length).toBe(3);
		//console.log(JSON.stringify(occurrences))

		var minimized = siatec.minimizePattern(patterns[5], vectors);
		expect(patterns[5].length).toBe(4);
		expect(minimized.length).toBe(3);
		expect(getFlompactness(patterns[5], vectors)).toBe(0.25);
		expect(getFlompactness(minimized, vectors)).toBe(0.5);
	});

	it("can select the best patterns", function() {
		//non-overlapping patterns
		var cosiatec = new Cosiatec(vectors, HEURISTICS.COMPACTNESS2, false);
		var patterns = cosiatec.getPatterns();
		expect(JSON.stringify(patterns)).toEqual("[[[1,1],[2,2]],[[1,3]]]");

		//overlapping patterns
		cosiatec = new Cosiatec(vectors, HEURISTICS.COMPACTNESS2, true);
		patterns = cosiatec.getPatterns();
		expect(JSON.stringify(patterns)).toEqual("[[[1,1],[2,2]],[[2,1],[2,2]],[[1,1],[1,3],[2,2]]]");
	});


	it("has various different heuristics", function() {
		var siatec = new Siatec(vectors, HEURISTICS.COMPACTNESS2, false);
		var patterns = siatec.getPatterns();

		//TODO TEST COVERAGE

		var compactness = patterns.map(p => getCompactness(p, vectors));
		expect(compactness).toEqual([ 0.25, 0.2, 0.2, 0.125, 0.2, 0.14285714285714285, 0.125, 0.125, 0.125, 0.3333333333333333, 0.3333333333333333, 0.125, 0.125, 0.3333333333333333, 0.125, 0.125, 0.125 ]);

		var flompactness = patterns.map(p => getFlompactness(p, vectors));
		expect(flompactness).toEqual([ 0.3333333333333333, 0.25, 0.25, 0.125, 0.3333333333333333, 0.25, 0.125, 0.125, 0.125, 0.5, 0.5, 0.125, 0.125, 0.5, 0.125, 0.125, 0.125 ]);

		var result = getPointsInBoundingBox([[0,1],[2,3]], [[0,0],[0,1],[0,2],[1,3],[2,4],[4,3]]);
		expect(_.isEqual(result, [[0,1],[0,2],[1,3]])).toBe(true);
	});

	it("can quantize the data", function() {
		//var quantizer = new Quantizer([{numDims:2} as Summary, {precision:2} as Rounded, {} as Ordering]);
		var quantizer = new Quantizer([getSummarize(2), getRound(2), getOrder()]);
		var result = quantizer.getQuantizedPoints([[[1,4,2,6,3],2.34264,9],[[1,4,7,6,3],5.65564,2]]);
		expect(JSON.stringify(result)).toBe("[[3,1,2.34,0],[2,3,5.66,1]]");
	});


});
