describe("a processor", function() {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	var basePath = 'files/';
	var sourcePath1 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var scheduler;

	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext);
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1", null, null, sourcePath1);
			DYMO_STORE.addBasePath("dymo1", basePath);
			DYMO_STORE.setParameter("dymo1", TIME_STRETCH_RATIO, 1);
			scheduler.loadBuffers(["dymo1"], function() {
				done();
			});
		});
	});

	it("can timestretch", function() {
		//console.profile("processor")
		var buffer = scheduler.getBuffer("dymo1");
		var stretched = new AudioProcessor(audioContext).timeStretch(buffer, 1.25);
		expect(stretched.getChannelData(0).length/10).toBeCloseTo(Math.round(0.8*buffer.getChannelData(0).length)/10, 0);
		//console.profileEnd("processor")
	});

	it("can timestretch dymos", function(done) {
		DYMO_STORE.setParameter("dymo1", TIME_STRETCH_RATIO, 0.5);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			scheduler.stop("dymo1");
			done();
		}, 100);
	});

	/*it("can timestretch live", function(done) {
		dymo1.getParameter(TIME_STRETCH_RATIO).relativeUpdate(-0.5);
		dymo1.getParameter(PLAYBACK_RATE).relativeUpdate(0.5);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo1"]);
			expect(audioContext.activeSourceCount).toBe(0);
			scheduler.stop(dymo1);
			done();
		}, 100);
	});*/

});
