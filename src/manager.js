/**
 * A class for easy access of all dymo core functionality.
 * @constructor
 * @param {Object=} $scope angular scope (optional, uicontrols will call $scope.$apply())
 * @param {Function=} onPlaybackChange (optional)
 */
function DymoManager(audioContext, scheduleAheadTime, reverbFile, $scope, onPlaybackChange) {
	
	var scheduler = new Scheduler(audioContext, onPlaybackChange);
	if (!isNaN(scheduleAheadTime)) {
		SCHEDULE_AHEAD_TIME = scheduleAheadTime;
	}
	var store;
	var dymos; //map with all dymos created accessible by keys
	var rendering;
	var uiControls = {};
	var sensorControls = {};
	
	this.loadDymoAndRenderingFromStore = function(newStore, callback) {
		store = newStore;
		var loader = new DymoLoader(scheduler);
		loader.setStore(store);
		processLoadedDymoAndRendering(loader.createDymoFromStore(), loader.createRenderingFromStore());
		scheduler.loadBuffers(rendering.dymos, callback);
	}
	
	this.loadDymoAndRendering = function(dymoUri, renderingUri, dymoCallback, buffersCallback) {
		var loader = new DymoLoader(scheduler, function() {
			loader.loadDymoFromJson(dymoUri, function(loadedDymo) {
				loader.loadRenderingFromJson(renderingUri, function(loadedRendering) {
					store = loader.getStore();
					processLoadedDymoAndRendering(loadedDymo, loadedRendering);
					scheduler.loadBuffers(rendering.dymos, buffersCallback);
					if (dymoCallback) {
						dymoCallback();
					}
				});
			});
		});
	}
	
	function processLoadedDymoAndRendering(loadedDymo, loadedRendering) {
		rendering = loadedRendering[0];
		rendering.dymos = loadedDymo[0];
		dymos = loadedDymo[1];
		for (var key in loadedRendering[1]) {
			var currentControl = loadedRendering[1][key];
			if (store.isSubclassOf(currentControl.getType(), UI_CONTROL)) {
				uiControls[key] = new UIControl(currentControl, $scope);
			}
			if (store.isSubclassOf(currentControl.getType(), SENSOR_CONTROL)) {
				sensorControls[key] = currentControl;
			}
		}
		if (!reverbFile) {
			reverbFile = 'bower_components/dymo-core/audio/impulse_rev.wav';
		}
		scheduler.initEffectSends(store, reverbFile);
	}
	
	this.loadDymoFromJson = function(jsonDymo, callback) {
		var loader = new DymoLoader(scheduler, function() {
			loader.loadDymoFromJson(jsonDymo, function(loadedDymo) {
				if (callback) {
					callback(loadedDymo[0][0]);
				}
			});
		});
	}
	
	this.parseDymoFromJson = function(jsonDymo, callback) {
		var loader = new DymoLoader(scheduler, function() {
			loader.parseDymoFromJson(jsonDymo, function(loadedDymo) {
				callback(loadedDymo[0][0]);
			});
		});
	}
	
	this.replacePartOfTopDymo = function(index, dymo) {
		var oldDymo = rendering.dymos[0].getPart(index);
		rendering.dymos[0].replacePart(index, dymo);
		scheduler.stop(oldDymo);
	}
	
	this.updateNavigatorPosition = function(dymo, level, position) {
		scheduler.updateNavigatorPosition(dymo, level, position);
	}
	
	this.getNavigatorPosition = function(dymo, level) {
		return scheduler.getNavigatorPosition(dymo, level);
	}
	
	//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	this.syncNavigators = function(syncDymo, goalDymo, level) {
		scheduler.syncNavigators(syncDymo, goalDymo, level);
	}
	
	this.startPlayingUri = function(dymoUri) {
		scheduler.play(dymos[dymoUri]);
	}
	
	this.stopPlayingUri = function(dymoUri) {
		scheduler.stop(dymos[dymoUri]);
	}
	
	this.startPlaying = function() {
		for (var i = 0; i < rendering.dymos.length; i++) {
			rendering.dymos[i].updatePartOrder(ONSET); //TODO WHERE TO PUT THIS??
			scheduler.play(rendering.dymos[i]);
		}
	}
	
	this.stopPlaying = function() {
		for (var i = 0; i < rendering.dymos.length; i++) {
			scheduler.stop(rendering.dymos[i]);
		}
	}
	
	this.getTopDymo = function() {
		return rendering.dymos[0];
	}
	
	this.getRendering = function() {
		return rendering;
	}
	
	this.getUIControls = function() {
		return uiControls;
	}
	
	this.getUIControl = function(key) {
		return uiControls[key];
	}
	
	this.getSensorControls = function() {
		return sensorControls;
	}
	
}