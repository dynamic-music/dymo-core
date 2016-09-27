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
			dymoStore.addTriple("d2", HAS_SIMILAR, "e2");
			dymoStore.addTriple("f0", HAS_SIMILAR, "d0");
			done();
		});
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
	});
	
	it("can find all objects in a hierarchy", function() {
		expect(dymoStore.findAllObjectsInHierarchy("d0")).toEqual(["d0", "d1", "d2", "d3"]);
		expect(dymoStore.findAllObjectsInHierarchy("e0")).toEqual(["e0", "e1", "e2", "d3"]);
	});
	
	it("can find the level of a part in a single hierarchy", function() {
		expect(dymoStore.getLevel("d0")).toBe(0);
		expect(dymoStore.getLevel("d1")).toBe(1);
		expect(dymoStore.getLevel("e2")).toBe(2);
	});
	
	it("can find the max level of structure", function() {
		expect(dymoStore.getMaxLevel()).toBe(2);
	});
	
	it("can create a part graph", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_PART, function(partGraph) {
			expect(partGraph.nodes.length).toBe(8);
			expect(partGraph.links.length).toBe(6);
			done();
		});
	});
	
	it("can create a graph for any predicate", function(done) {
		dymoStore.toJsonGraph(DYMO, HAS_SIMILAR, function(similarityGraph) {
			expect(similarityGraph.nodes.length).toBe(8);
			expect(similarityGraph.links.length).toBe(2);
			done();
		});
	});
	
});