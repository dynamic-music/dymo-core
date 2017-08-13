import 'isomorphic-fetch';
import { DymoStore } from '../../src/io/dymostore';
import { SLIDER, TOGGLE, LEVEL_FEATURE, AMPLITUDE, ONSET_FEATURE, PITCH_FEATURE, DURATION_FEATURE, GRAPH_NAVIGATOR,
	ONE_SHOT_NAVIGATOR, SEGMENT_LABEL_FEATURE, LISTENER_ORIENTATION, DYMO, HAS_PART, HAS_SUCCESSOR,
	HAS_SIMILAR, DURATION_RATIO, FILTER, CONTEXT_URI } from '../../src/globals/uris';
import { SERVER_ROOT } from './server';

describe("a dymostore", function() {

	var dymoStore: DymoStore;
	var CU = CONTEXT_URI;

	beforeAll(function(done) {
		dymoStore = new DymoStore();
		dymoStore.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
			dymoStore.addDymo(CU+"d0");
			dymoStore.addDymo(CU+"d1", CU+"d0");
			dymoStore.addDymo(CU+"d2", CU+"d0");
			dymoStore.addDymo(CU+"d3", CU+"d0");
			dymoStore.addDymo(CU+"e0");
			dymoStore.addDymo(CU+"e1", CU+"e0");
			dymoStore.addDymo(CU+"e2", CU+"e1");
			dymoStore.addDymo(CU+"d3", CU+"e1");
			dymoStore.addDymo(CU+"f0");
			dymoStore.addSimilar(CU+"d2", CU+"e2");
			dymoStore.addSimilar(CU+"f0", CU+"d0");
			done();
		});
	});

	it("can add renderings, controls, and navigators", function() {
		dymoStore.addRendering(CU+"r0", CU+"d0");
		var slider = dymoStore.addControl(CU+"c0", SLIDER);
		var toggle = dymoStore.addControl(CU+"c1", TOGGLE);
		dymoStore.addNavigator(CU+"r0", GRAPH_NAVIGATOR, CU+"levelOVar");
		dymoStore.addNavigator(CU+"r0", ONE_SHOT_NAVIGATOR, CU+"levelOVar");
		expect(dymoStore.find(CU+"r0").length).toBe(4);
		expect(dymoStore.findNavigators(CU+"r0").length).toBe(2);
	});

	it("can set and find features", function() {
		dymoStore.setFeature(CU+"d1", ONSET_FEATURE, 0);
		dymoStore.setFeature(CU+"d2", ONSET_FEATURE, 5.438);
		dymoStore.setFeature(CU+"d2", PITCH_FEATURE, 61);
		dymoStore.setFeature(CU+"d2", SEGMENT_LABEL_FEATURE, "A'");
		dymoStore.setFeature(CU+"d3", ONSET_FEATURE, 2);
		dymoStore.setFeature(CU+"e1", CU+"mfcc", [2,4.2,-1,5.3]);
		expect(dymoStore.findFeatureValue(CU+"d1", ONSET_FEATURE)).toEqual(0);
		expect(dymoStore.findFeatureValue(CU+"d2", ONSET_FEATURE)).toEqual(5.438);
		expect(dymoStore.findFeatureValue(CU+"d2", PITCH_FEATURE)).toEqual(61);
		expect(dymoStore.findFeatureValue(CU+"d2", SEGMENT_LABEL_FEATURE)).toEqual("A'");
		expect(dymoStore.findFeatureValue(CU+"d3", ONSET_FEATURE)).toEqual(2);
		expect(dymoStore.findFeatureValue(CU+"e1", CU+"mfcc")).toEqual([2,4.2,-1,5.3]);
		expect(dymoStore.findAttributeValue(CU+"d2", ONSET_FEATURE)).toEqual(5.438);
		expect(dymoStore.findAllFeatureValues(CU+"d2").length).toBe(3);
		expect(dymoStore.findAllNumericFeatureValues(CU+"d2").length).toBe(2);
		//nan features should not work
		dymoStore.setFeature(CU+"e2", ONSET_FEATURE, NaN);
		expect(dymoStore.findFeatureValue(CU+"e2", ONSET_FEATURE)).toBeUndefined();
	});

	it("can set and find parameters", function() {
		dymoStore.setParameter(CU+"d1", AMPLITUDE, 0);
		dymoStore.setParameter(CU+"d2", AMPLITUDE, 5);
		dymoStore.setParameter(CU+"d3", AMPLITUDE, 2);
		expect(dymoStore.findParameterValue(CU+"d1", AMPLITUDE)).toEqual(0);
		expect(dymoStore.findParameterValue(CU+"d2", AMPLITUDE)).toEqual(5);
		expect(dymoStore.findParameterValue(CU+"d3", AMPLITUDE)).toEqual(2);
		//general parameters (without owners)
		expect(dymoStore.findParameterValue(null, LISTENER_ORIENTATION)).toBeUndefined();
		dymoStore.setParameter(null, LISTENER_ORIENTATION, 0.2);
		expect(dymoStore.findParameterValue(null, LISTENER_ORIENTATION)).toEqual(0.2);
	});

	it("can add and remove parameter observers", function() {
		var observer = new (function(){
			this.currentUri, this.currentType, this.currentValue;
			this.observedValueChanged = function(uri, type, value) {
				this.currentUri = uri;
				this.currentType = type;
				this.currentValue = value;
			}
		});
		dymoStore.addParameterObserver(CU+"e1", AMPLITUDE, observer);
		expect(observer.currentUri).toBeUndefined();
		expect(observer.currentType).toBeUndefined();
		expect(observer.currentValue).toBeUndefined();
		dymoStore.setParameter(CU+"e1", AMPLITUDE, 3);
		expect(observer.currentUri).not.toBeUndefined();
		expect(observer.currentType).toEqual(AMPLITUDE);
		expect(observer.currentValue).toBe(3);
		var paramUri = dymoStore.setParameter(CU+"e2", DURATION_RATIO, 5);
		dymoStore.addSpecificParameterObserver(paramUri, observer);
		dymoStore.setParameter(CU+"e2", DURATION_RATIO, 10);
		expect(observer.currentType).toEqual(DURATION_RATIO);
		expect(observer.currentValue).toBe(10);
		dymoStore.removeParameterObserver(CU+"e2", FILTER, observer);
		dymoStore.setParameter(CU+"e2", FILTER, 11);
		expect(observer.currentType).toEqual(DURATION_RATIO);
		expect(observer.currentValue).toBe(10);
	});

	it("can store base paths", function() {
		dymoStore.addBasePath(CU+"e0", "dir1/");
		expect(dymoStore.getBasePath(CU+"e0")).toBe("dir1/");
		expect(dymoStore.getBasePath(CU+"e1")).toBe("dir1/");
		expect(dymoStore.getBasePath(CU+"e2")).toBe("dir1/");
		expect(dymoStore.getBasePath(CU+"d3")).toBe("dir1/");
		expect(dymoStore.getBasePath(CU+"d1")).toBeUndefined();
		dymoStore.addBasePath(CU+"d1", "dir2/");
		expect(dymoStore.getBasePath(CU+"e2")).toBe("dir1/");
		expect(dymoStore.getBasePath(CU+"d1")).toBe("dir2/");
		//TODO still depth first, change to breadth first sometime
		//expect(dymoStore.getBasePath(CU+"d3")).toBe("dir2/");
	});

	it("can find top dymos", function() {
		var topDymos = dymoStore.findTopDymos();
		expect(topDymos.length).toBe(3);
		expect(topDymos).toContain(CU+"d0");
		expect(topDymos).toContain(CU+"e0");
		expect(topDymos).toContain(CU+"f0");
	});

	it("can find part lists", function() {
		expect(dymoStore.findParts(CU+"d0")).toEqual([CU+"d1", CU+"d2", CU+"d3"]);
		expect(dymoStore.findParts(CU+"e0")).toEqual([CU+"e1"]);
		expect(dymoStore.findParts(CU+"e1")).toEqual([CU+"e2", CU+"d3"]);
		expect(dymoStore.findParts(CU+"d1")).toEqual([]);
	});

	it("can find parent lists", function() {
		var parents = dymoStore.findParents(CU+"d3");
		expect(parents.length).toBe(2);
		expect(parents).toContain(CU+"d0");
		expect(parents).toContain(CU+"e1");
		parents = dymoStore.findParents(CU+"d0");
		expect(parents.length).toBe(0);
	});

	it("can find all objects in a hierarchy", function() {
		expect(dymoStore.findAllObjectsInHierarchy(CU+"d0")).toEqual([CU+"d0", CU+"d1", CU+"d2", CU+"d3"]);
		expect(dymoStore.findAllObjectsInHierarchy(CU+"e0")).toEqual([CU+"e0", CU+"e1", CU+"e2", CU+"d3"]);
	});

	it("can find the level of a part in a single hierarchy", function() {
		expect(dymoStore.findLevel(CU+"d0")).toBe(0);
		expect(dymoStore.findLevel(CU+"d1")).toBe(1);
		expect(dymoStore.findLevel(CU+"e2")).toBe(2);
		expect(dymoStore.findFeatureValue(CU+"d1", LEVEL_FEATURE)).toBe(1);
	});

	it("can find the max level of structure", function() {
		expect(dymoStore.findMaxLevel()).toBe(2);
	});

	it("can find the index of a part and parts at an index", function() {
		expect(dymoStore.findPartIndex(CU+"d1")).toBe(0);
		expect(dymoStore.findPartIndex(CU+"d2")).toBe(1);
		//TODO expect(dymoStore.findPartIndex(CU+"d3")).toBe([1,2]);
		expect(dymoStore.findPartIndex(CU+"e2")).toBe(0);
		expect(dymoStore.findPartIndex(CU+"f0")).toBeUndefined();
		expect(dymoStore.findFeatureValue(CU+"d2", LEVEL_FEATURE)).toBe(1);

		expect(dymoStore.findPartAt(CU+"d0", 2)).toBe(CU+"d3");
		expect(dymoStore.findPartAt(CU+"e1", 1)).toBe(CU+"d3");
		expect(dymoStore.findPartAt(CU+"f0", 0)).toBeUndefined();
	});

	it("can replace dymos in a hierarchy", function() {
		dymoStore.replacePartAt(CU+"e0", CU+"d0", 0);
		expect(dymoStore.findParts(CU+"d0")).toEqual([CU+"d1", CU+"d2", CU+"d3"]);
		expect(dymoStore.findParts(CU+"e0")).toEqual([CU+"d0"]);
		expect(dymoStore.findParents(CU+"d0")).toEqual([CU+"e0"]);
	});

	it("can find all dymo relations", function() {
		expect(dymoStore.findDymoRelations()).toEqual([HAS_PART,HAS_SUCCESSOR,HAS_SIMILAR]);
	});

	it("can create a part graph", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_PART)
			.then(partGraph => {
				expect(partGraph.nodes.length).toBe(8);
				expect(partGraph.edges.length).toBe(6);
				done();
			});
	});

	it("can create a graph for any predicate", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_SIMILAR)
			.then(similarityGraph => {
				expect(similarityGraph.nodes.length).toBe(8);
				expect(similarityGraph.edges.length).toBe(2);
				done();
			});
	});

});
