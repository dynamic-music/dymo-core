describe("a dynamic music object", function() {
	it("returns its uri", function() {
		var dymo1 = new DynamicMusicObject("dymo1");
		expect(dymo1.getUri()).toBe("dymo1");
	});
});