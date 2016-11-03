describe("a scheduler", function() {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	var basePath = 'files/';
	var sourcePath1 = 'sark1.m4a';
	var sourcePath2 = 'sark2.m4a';
	var sourcePath3 = 'Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p031_ne0001_s006221.wav';
	var scheduler;

	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

	beforeAll(function(done) {
		scheduler = new Scheduler(audioContext);
		DYMO_STORE = new DymoStore(function(){
			DYMO_STORE.addDymo("dymo1", null, null, null, CONJUNCTION);
			DYMO_STORE.addDymo("dymo2", "dymo1", null, sourcePath1);
			DYMO_STORE.addDymo("dymo3", "dymo1", null, sourcePath2);
			DYMO_STORE.setParameter("dymo1", AMPLITUDE, 1);
			DYMO_STORE.setParameter("dymo2", AMPLITUDE, 1);
			DYMO_STORE.setParameter("dymo3", AMPLITUDE, 1);
			DYMO_STORE.addBasePath("dymo1", basePath);

			DYMO_STORE.addDymo("dymo0", null, null, sourcePath3);
			DYMO_STORE.setParameter("dymo0", AMPLITUDE, 0);
			DYMO_STORE.setParameter("dymo0", LOOP, 0);
			DYMO_STORE.addBasePath("dymo0", basePath);

			scheduler.init(null, ["dymo0", "dymo1"], function() {
				done();
			});
		});
	});

	it("plays and stops a parallel dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2", "dymo3"]);
			expect(DYMO_STORE.getParameterObservers("dymo1", AMPLITUDE).length).toBe(1);
			expect(DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			expect(DYMO_STORE.getParameterObservers("dymo3", AMPLITUDE).length).toBe(1);
			scheduler.stop("dymo1");
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
				expect(DYMO_STORE.getParameterObservers("dymo1", AMPLITUDE).length).toBe(0);
				expect(DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
				expect(DYMO_STORE.getParameterObservers("dymo3", AMPLITUDE).length).toBe(0);
				done();
			}, 100);
		}, 100);
	});

	it("stops subdymos", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2", "dymo3"]);
			scheduler.stop("dymo2");
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo3"]);
				scheduler.stop("dymo1");
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});

	it("plays a sequential dymo", function(done) {
		DYMO_STORE.setTriple("dymo1", CDT, SEQUENCE);
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		scheduler.play("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			done();
		}, 100);
	});

	it("reacts to updates", function(done) {
		DYMO_STORE.setParameter("dymo2", AMPLITUDE, 0.4);
		expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.4, 7);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
			DYMO_STORE.setParameter("dymo2", AMPLITUDE, 0.7);
			expect(scheduler.getSources("dymo2")[0].getParameterValue(AMPLITUDE)).toBeCloseTo(0.7, 7);
			//expect(audioContext.activeSourceCount).toBe(1);
			expect(DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(1);
			setTimeout(function() {
				done();
			}, 100);
		}, 100);
	});

	it("stops a dymo and cleans up the sources", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
		scheduler.stop("dymo1");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
			expect(DYMO_STORE.getParameterObservers("dymo2", AMPLITUDE).length).toBe(0);
			done();
		}, 100);
	});

	it("loops a dymo", function(done) {
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		DYMO_STORE.setParameter("dymo0", LOOP, 1);
		scheduler.play("dymo0");
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo0"]);
			//expect(audioContext.activeSourceCount).toBe(1);
			//console.log(dymo0.getParameter(LOOP).getObservers().map(function(s){return s.getDymo().getUri();}))
			expect(DYMO_STORE.getParameterObservers("dymo0", LOOP).length).toBe(2); //nextSource is already observing..
			expect(DYMO_STORE.getParameterObservers("dymo0", AMPLITUDE).length).toBe(2);
			DYMO_STORE.setParameter("dymo2", LOOP, 0);
			setTimeout(function() {
				//not quite done playing yet
				expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo0"]);
				scheduler.stop("dymo0");
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
					done();
				}, 100);
			}, 100);
		}, 100);
	});

	it("observes and reacts to the play parameter of all dymos", function(done) {
		DYMO_STORE.setTriple("dymo1", CDT, CONJUNCTION);
		expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
		DYMO_STORE.setParameter("dymo1", PLAY, 1);
		setTimeout(function() {
			expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2", "dymo3"]);
			DYMO_STORE.setParameter("dymo3", PLAY, 0);
			setTimeout(function() {
				expect(scheduler.getUrisOfPlayingDymos()).toEqual(["dymo1", "dymo2"]);
				DYMO_STORE.setParameter("dymo1", PLAY, 0);
				setTimeout(function() {
					expect(scheduler.getUrisOfPlayingDymos()).toEqual([]);
					done();
				}, 100);
				done();
			}, 100);
		}, 100);
	});

});
