describe("a scheduler", function() {
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	
	var basePath = '../example/';
	var sourcePath1 = 'sark1.m4a';
	var sourcePath2 = 'sark2.m4a';
	var sourcePath3 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var dymo1, dymo2, dymo3, dymo0;
	var scheduler;
	
	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext, function() {
			done();
		});
		dymo1 = new DynamicMusicObject("dymo1", scheduler, PARALLEL);
		dymo2 = new DynamicMusicObject("dymo2", scheduler);
		dymo3 = new DynamicMusicObject("dymo3", scheduler);
		dymo1.addPart(dymo2);
		dymo1.addPart(dymo3);
		dymo2.setSourcePath(basePath+sourcePath1);
		scheduler.addSourceFile(basePath+sourcePath1);
		dymo3.setSourcePath(basePath+sourcePath2);
		scheduler.addSourceFile(basePath+sourcePath2);
		
		dymo0 = new DynamicMusicObject("dymo0", scheduler);
		dymo0.setSourcePath(basePath+sourcePath3);
		scheduler.addSourceFile(basePath+sourcePath3);
		scheduler.loadBuffers();
	});
	
	it("plays a parallel dymo", function(done) {
		expect(scheduler.urisOfPlayingDymos).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo2", "dymo1", "dymo3"]);
			//expect(audioContext.activeSourceCount).toBe(2);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			expect(dymo3.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			done();
		}, 100);
	});
	
	it("stops a parallel dymo", function(done) {
		expect(scheduler.urisOfPlayingDymos).toEqual(["dymo2", "dymo1", "dymo3"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual([]);
			//expect(audioContext.activeSourceCount).toBe(0);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(0);
			expect(dymo3.getParameter(AMPLITUDE).getObservers().length).toBe(0);
			done();
		}, 100);
	});
	
	it("plays a sequential dymo", function(done) {
		dymo1.setType(SEQUENTIAL);
		expect(scheduler.urisOfPlayingDymos).toEqual([]);
		scheduler.play(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo2", "dymo1"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			done();
		}, 100);
	});
	
	it("reacts to updates", function(done) {
		dymo2.getParameter(AMPLITUDE).relativeUpdate(-0.6);
		expect(scheduler.getSources(dymo1)[dymo2.getUri()].getParameterValue(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo2", "dymo1"]);
			dymo2.getParameter(AMPLITUDE).relativeUpdate(0.3);
			expect(scheduler.getSources(dymo1)[dymo2.getUri()].getParameterValue(AMPLITUDE)).toBeCloseTo(0.7, 7);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			setTimeout(function() {
				done();
			}, 100);
		}, 100);
	});
	
	it("stops a dymo and cleans up the sources", function(done) {
		expect(scheduler.urisOfPlayingDymos).toEqual(["dymo2", "dymo1"]);
		scheduler.stop(dymo1);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual([]);
			expect(dymo2.getParameter(AMPLITUDE).getObservers().length).toBe(0);
			done();
		}, 100);
	});
	
	it("loops a dymo", function(done) {
		expect(scheduler.urisOfPlayingDymos).toEqual([]);
		dymo0.getParameter(LOOP).update(1);
		scheduler.play(dymo0);
		setTimeout(function() {
			expect(scheduler.urisOfPlayingDymos).toEqual(["dymo0"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(dymo0.getParameter(LOOP).getObservers().length).toBe(1);
			expect(dymo0.getParameter(AMPLITUDE).getObservers().length).toBe(1);
			dymo0.getParameter(LOOP).update(0);
			setTimeout(function() {
				//not quite done playing yet
				expect(scheduler.urisOfPlayingDymos).toEqual(["dymo0"]);
				scheduler.stop(dymo0);
				expect(scheduler.urisOfPlayingDymos).toEqual([]);
				done();
			}, 100);
		}, 100);
	});
	
});