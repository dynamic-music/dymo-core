/**
 * A class for easy access of all dymo core functionality.
 * @constructor
 */
function DymoManager(audioContext, scheduleAheadTime, reverbFile) {
	
	var scheduler = new Scheduler(audioContext, function(){});
	if (!reverbFile) {
		reverbFile = 'bower_components/dymo-core/audio/impulse_rev.wav';
	}
	scheduler.setReverbFile(reverbFile);
	if (!isNaN(scheduleAheadTime)) {
		SCHEDULE_AHEAD_TIME = scheduleAheadTime;
	}
	var rendering;
	var uiControls = {};
	
	this.loadDymoAndRendering = function(dymoUri, renderingUri, callback) {
		var loader = new DymoLoader(scheduler);
		loader.loadDymoFromJson(dymoUri, function(loadedDymo) {
			loader.loadRenderingFromJson(renderingUri, loadedDymo[1], function(loadedRendering) {
				rendering = loadedRendering[0];
				rendering.dymo = loadedDymo[0];
				for (var key in loadedRendering[1]) {
					var currentControl = loadedRendering[1][key];
					if (UI_CONTROLS.indexOf(currentControl.getType()) >= 0) {
						uiControls[key] = new UIControl(currentControl);
					}
				}
				scheduler.loadBuffers(rendering.dymo);
				if (callback) {
					callback();
				}
			});
		});
	}
	
	this.loadDymoFromJson = function(jsonDymo, callback) {
		new DymoLoader(scheduler).loadDymoFromJson(jsonDymo, function(loadedDymo) {
			if (callback) {
				callback(loadedDymo[0]);
			}
		});
	}
	
	this.parseDymoFromJson = function(jsonDymo, callback) {
		new DymoLoader(scheduler).parseDymoFromJson(jsonDymo, function(loadedDymo) {
			callback(loadedDymo[0]);
		});
	}
	
	this.replacePartOfTopDymo = function(index, dymo) {
		var oldDymo = rendering.dymo.getPart(index);
		rendering.dymo.replacePart(index, dymo);
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
	
	this.startPlaying = function() {
		rendering.dymo.updatePartOrder(ONSET); //TODO WHERE TO PUT THIS??
		scheduler.play(rendering.dymo);
	}
	
	this.stopPlaying = function() {
		scheduler.stop(rendering.dymo);
	}
	
	this.getTopDymo = function() {
		return rendering.dymo;
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
	
}