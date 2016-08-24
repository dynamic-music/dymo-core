describe("a scheduler", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var basePath = 'files/';
	var sourcePath1 = 'sark1.m4a';
	var sourcePath2 = 'sark2.m4a';
	var sourcePath3 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var dymo1, dymo2, dymo3, dymo0;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		dymo1 = new DynamicMusicObject("dymo1", CONJUNCTION);
		dymo2 = new DynamicMusicObject("dymo2");
		dymo3 = new DynamicMusicObject("dymo3");
		dymo1.setBasePath(basePath);
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo2.setSourcePath(sourcePath1);
		dymo3.setSourcePath(sourcePath2);
		
		dymo0 = new DynamicMusicObject("dymo0");
		dymo0.setSourcePath(sourcePath3);
		dymo0.setBasePath(basePath);
		scheduler.loadBuffers(dymo1);
		scheduler.loadBuffers(dymo0);
	});
	
	it("plays and stops a parallel dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2", "dymo3"]);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			expect(dymo3.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			scheduler.stop(dymo1);
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
				expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(0);
				expect(dymo3.getParameter(AMPLITUDE).getObservers().length).toBe(0);
				done();
			}, 100);
		}, 100);
	});
	
	it("stops subdymos", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2", "dymo3"]);
			scheduler.stop(dymo2);
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo3"]);
				scheduler.stop(dymo1);
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});
	
	it("plays a sequential dymo", function(done) {
		dymo1.setType(SEQUENCE);
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			done();
		}, 100);
	});
	
	it("reacts to updates", function(done) {
		dymo2.getParameter(AMPLITUDE).relativeUpdate(-0.6);
		expect(scheduler.getSources(dymo2)[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
			dymo2.getParameter(AMPLITUDE).relativeUpdate(0.3);
			expect(scheduler.getSources(dymo2)[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.7, 7);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			setTimeout(function() {
				done();
			}, 100);
		}, 100);
	});
	
	it("stops a dymo and cleans up the sources", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(0);
			done();
		}, 100);
	});
	
	it("loops a dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		dymo0.getParameter(LOOP).update(1);
		scheduler.play(dymo0);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo0"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			//console.log(dymo0.getParameter(LOOP).getObservers().map(function(s){return s.getDymo().getUri();}))
			expect(dymo0.getParameter(LOOP).getObservers().length).toBe(2); //nextSource is already observing..
			expect(dymo0.getParameter(AMPLITUDE).getObservers().length).toBe(2);
			dymo0.getParameter(LOOP).update(0);
			setTimeout(function() {
				//not quite done playing yet
				expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo0"]);
				scheduler.stop(dymo0);
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});
	
});