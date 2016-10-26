describe("an easystore", function() {

	var easyStore;

	/*beforeEach(function(done) {

	});*/

	it("can find subclasses", function(done) {
		easyStore = new DymoStore(function() {
			expect(easyStore.isSubclassOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(false);
			expect(easyStore.isSubclassOf(ACCELEROMETER_X, SENSOR_CONTROL)).toBe(true);
			expect(easyStore.isSubclassOf(ACCELEROMETER_X, MOBILE_CONTROL)).toBe(true);
			expect(easyStore.isSubclassOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(false);
			expect(easyStore.isSubclassOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(true);
			expect(easyStore.isSubclassOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
			done();
		});
	});

	it("can find subtypes", function(done) {
		easyStore = new DymoStore(function() {
			expect(easyStore.isSubtypeOf(ONSET_FEATURE, FEATURE_TYPE)).toBe(true);
			expect(easyStore.isSubtypeOf(AMPLITUDE, AUDIO_PARAMETER)).toBe(true);
			expect(easyStore.isSubtypeOf(AUDIO_PARAMETER, PARAMETER_TYPE)).toBe(false);
			expect(easyStore.isSubtypeOf(AMPLITUDE, PARAMETER_TYPE)).toBe(false);
			done();
		});
	});

});
