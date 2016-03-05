/**
 * A class for easy access of all dymo core functionality.
 * @constructor
 */
function DymoManager(audioContext, scheduleAheadTime) {
	
	var scheduler = new Scheduler(audioContext, function(){});
	scheduler.setReverbFile('bower_components/dymo-core/audio/impulse_rev.wav');
	scheduler.setScheduleAheadTime(scheduleAheadTime);
	var rendering;
	var uiControls = {};
	
	this.loadDymoAndRendering = function(dymoUri, renderingUri) {
		var loader = new DymoLoader(scheduler);
		loader.loadDymoFromJson('', dymoUri, function(loadedDymo) {
			loader.loadRenderingFromJson(renderingUri, loadedDymo[1], function(loadedRendering) {
				rendering = loadedRendering[0];
				rendering.dymo = loadedDymo[0];
				for (var key in loadedRendering[1]) {
					var currentControl = loadedRendering[1][key];
					if (UI_CONTROLS.indexOf(currentControl.getType()) >= 0) {
						uiControls[key] = new UIControl(currentControl);
					}
				}
			});
		});
	}
	
	this.loadDymoFromJson = function(jsonDymo, callback) {
		new DymoLoader(scheduler).parseDymoFromJson(jsonDymo, function(loadedDymo) {
			callback(loadedDymo[0]);
		});
	}
	
	this.startPlaying = function() {
		scheduler.play(rendering.dymo);
	}
	
	this.getTopDymo = function() {
		return rendering.dymo;
	}
	
	this.getUIControl = function(key) {
		return uiControls[key];
	}
	
}