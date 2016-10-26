describe("a dymostore", function() {

	var dymoStore;

	beforeEach(function(done) {
		dymoStore = new DymoStore(function(){
			dymoStore.addDymo("d0");
			dymoStore.addDymo("d1", "d0");
			dymoStore.addDymo("d2", "d0");
			dymoStore.addDymo("d3", "d0");
			dymoStore.addDymo("e0");
			dymoStore.addDymo("e1", "e0");
			dymoStore.addDymo("e2", "e1");
			dymoStore.addDymo("d3", "e1");
			dymoStore.addDymo("f0");
			dymoStore.addSimilar("d2", "e2");
			dymoStore.addSimilar("f0", "d0");
			done();
		});
	});

	it("can add renderings, mappings, and navigators", function() {
		dymoStore.addRendering("r0", "d0");
		dymoStore.addMapping("r0",[{"name":"c0","@type":SLIDER},{"@type":ONSET_FEATURE}],[["a"],"return 2*a"],null,[["d"],"return d.getLevel()==1"],AMPLITUDE);
		var mapping2Uri = dymoStore.addMapping("r0",[{"name":"c1","@type":TOGGLE},{"@type":DURATION_FEATURE}],[["a","b"],"return a/b"],["e0","d3","f0"],null,DURATION_RATIO);
		dymoStore.addNavigator("r0", GRAPH_NAVIGATOR, ["d"], "return d.getLevel()==0");
		dymoStore.addNavigator("r0", REPEATED_NAVIGATOR, ["d"], "return d.getLevel()==1");
		expect(dymoStore.find("r0").length).toBe(6);
		expect(dymoStore.findMappings("r0").length).toBe(2);
		var functionUri = dymoStore.findObject(mapping2Uri, HAS_FUNCTION);
		expect(dymoStore.findFunction(functionUri)(3.6,7.4)).toEqual(function(a,b){return a/b;}(3.6,7.4));
		expect(dymoStore.findNavigators("r0").length).toBe(2);
	});

	it("can set and find features", function() {
		dymoStore.setFeature("d1", ONSET_FEATURE, 0);
		dymoStore.setFeature("d2", ONSET_FEATURE, 5.438);
		dymoStore.setFeature("d2", PITCH_FEATURE, 61);
		dymoStore.setFeature("d2", SEGMENT_LABEL_FEATURE, "A'");
		dymoStore.setFeature("d3", ONSET_FEATURE, 2);
		dymoStore.setFeature("e1", "mfcc", [2,4.2,-1,5.3]);
		expect(dymoStore.findFeatureValue("d1", ONSET_FEATURE)).toEqual(0);
		expect(dymoStore.findFeatureValue("d2", ONSET_FEATURE)).toEqual(5.438);
		expect(dymoStore.findFeatureValue("d2", PITCH_FEATURE)).toEqual(61);
		expect(dymoStore.findFeatureValue("d2", SEGMENT_LABEL_FEATURE)).toEqual("A'");
		expect(dymoStore.findFeatureValue("d3", ONSET_FEATURE)).toEqual(2);
		expect(dymoStore.findFeatureValue("e1", "mfcc")).toEqual([2,4.2,-1,5.3]);
		expect(dymoStore.findAttributeValue("d2", ONSET_FEATURE)).toEqual(5.438);
		expect(dymoStore.findAllFeatureValues("d2").length).toBe(3);
		expect(dymoStore.findAllNumericFeatureValues("d2").length).toBe(2);
		//nan features should not work
		dymoStore.setFeature("e2", ONSET_FEATURE, NaN);
		expect(dymoStore.findFeatureValue("e2", ONSET_FEATURE)).toBeUndefined();
	});

	it("can set and find parameters", function() {
		dymoStore.setParameter("d1", AMPLITUDE, 0);
		dymoStore.setParameter("d2", AMPLITUDE, 5);
		dymoStore.setParameter("d3", AMPLITUDE, 2);
		expect(dymoStore.findParameterValue("d1", AMPLITUDE)).toEqual(0);
		expect(dymoStore.findParameterValue("d2", AMPLITUDE)).toEqual(5);
		expect(dymoStore.findParameterValue("d3", AMPLITUDE)).toEqual(2);
		//general parameters (without owners)
		expect(dymoStore.findParameterValue(null, LISTENER_ORIENTATION)).toBeUndefined();
		dymoStore.setParameter(null, LISTENER_ORIENTATION, 0.2);
		expect(dymoStore.findParameterValue(null, LISTENER_ORIENTATION)).toEqual(0.2);
	});

	it("can add controls", function() {

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
		dymoStore.addParameterObserver("e1", AMPLITUDE, observer);
		expect(observer.currentUri).toBeUndefined();
		expect(observer.currentType).toBeUndefined();
		expect(observer.currentValue).toBeUndefined();
		dymoStore.setParameter("e1", AMPLITUDE, 3);
		expect(observer.currentUri).not.toBeUndefined();
		expect(observer.currentType).toEqual(AMPLITUDE);
		expect(observer.currentValue).toBe(3);
		var paramUri = dymoStore.setParameter("e2", DURATION_RATIO, 5);
		dymoStore.addSpecificParameterObserver(paramUri, observer);
		dymoStore.setParameter("e2", DURATION_RATIO, 10);
		expect(observer.currentType).toEqual(DURATION_RATIO);
		expect(observer.currentValue).toBe(10);
		dymoStore.removeParameterObserver("e2", FILTER, observer);
		dymoStore.setParameter("e2", FILTER, 11);
		expect(observer.currentType).toEqual(DURATION_RATIO);
		expect(observer.currentValue).toBe(10);
	});

	it("can store base paths", function() {
		dymoStore.addBasePath("e0", "dir1/");
		expect(dymoStore.getBasePath("e0")).toBe("dir1/");
		expect(dymoStore.getBasePath("e1")).toBe("dir1/");
		expect(dymoStore.getBasePath("e2")).toBe("dir1/");
		expect(dymoStore.getBasePath("d3")).toBe("dir1/");
		expect(dymoStore.getBasePath("d1")).toBeUndefined();
		dymoStore.addBasePath("d1", "dir2/");
		expect(dymoStore.getBasePath("e2")).toBe("dir1/");
		expect(dymoStore.getBasePath("d1")).toBe("dir2/");
		//TODO still depth first, change to breadth first sometime
		//expect(dymoStore.getBasePath("d3")).toBe("dir2/");
	});

	it("can find top dymos", function() {
		var topDymos = dymoStore.findTopDymos();
		expect(topDymos.length).toBe(3);
		expect(topDymos).toContain("d0");
		expect(topDymos).toContain("e0");
		expect(topDymos).toContain("f0");
	});

	it("can find part lists", function() {
		expect(dymoStore.findParts("d0")).toEqual(["d1", "d2", "d3"]);
		expect(dymoStore.findParts("e0")).toEqual(["e1"]);
		expect(dymoStore.findParts("e1")).toEqual(["e2", "d3"]);
		expect(dymoStore.findParts("d1")).toEqual([]);
	});

	it("can find parent lists", function() {
		var parents = dymoStore.findParents("d3");
		expect(parents.length).toBe(2);
		expect(parents).toContain("d0");
		expect(parents).toContain("e1");
		parents = dymoStore.findParents("d0");
		expect(parents.length).toBe(0);
	});

	it("can find all objects in a hierarchy", function() {
		expect(dymoStore.findAllObjectsInHierarchy("d0")).toEqual(["d0", "d1", "d2", "d3"]);
		expect(dymoStore.findAllObjectsInHierarchy("e0")).toEqual(["e0", "e1", "e2", "d3"]);
	});

	it("can find the level of a part in a single hierarchy", function() {
		expect(dymoStore.findLevel("d0")).toBe(0);
		expect(dymoStore.findLevel("d1")).toBe(1);
		expect(dymoStore.findLevel("e2")).toBe(2);
		expect(dymoStore.findFeatureValue("d1", LEVEL_FEATURE)).toBe(1);
	});

	it("can find the max level of structure", function() {
		expect(dymoStore.findMaxLevel()).toBe(2);
	});

	it("can find the index of a part and parts at an index", function() {
		expect(dymoStore.findPartIndex("d1")).toBe(0);
		expect(dymoStore.findPartIndex("d2")).toBe(1);
		//TODO expect(dymoStore.findPartIndex("d3")).toBe([1,2]);
		expect(dymoStore.findPartIndex("e2")).toBe(0);
		expect(dymoStore.findPartIndex("f0")).toBeUndefined();
		expect(dymoStore.findFeatureValue("d2", LEVEL_FEATURE)).toBe(1);

		expect(dymoStore.findPartAt("d0", 2)).toBe("d3");
		expect(dymoStore.findPartAt("e1", 1)).toBe("d3");
		expect(dymoStore.findPartAt("f0", 0)).toBeUndefined();
	});

	it("can replace dymos in a hierarchy", function() {
		dymoStore.replacePartAt("e0", "d0", 0);
		expect(dymoStore.findParts("d0")).toEqual(["d1", "d2", "d3"]);
		expect(dymoStore.findParts("e0")).toEqual(["d0"]);
		expect(dymoStore.findParents("d0")).toEqual(["e0"]);
	});

	it("can find all dymo relations", function() {
		expect(dymoStore.findDymoRelations()).toEqual([HAS_PART,HAS_SUCCESSOR,HAS_SIMILAR]);
	});

	it("can create a part graph", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_PART, function(partGraph) {
			expect(partGraph.nodes.length).toBe(8);
			expect(partGraph.edges.length).toBe(6);
			done();
		});
	});

	it("can create a graph for any predicate", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_SIMILAR, function(similarityGraph) {
			expect(similarityGraph.nodes.length).toBe(8);
			expect(similarityGraph.edges.length).toBe(2);
			done();
		});
	});

});
