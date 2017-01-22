import { GlobalVars } from './globals/globals'
import * as uris from './globals/uris'
import { Scheduler } from './audio/scheduler'
import { DymoStore } from './io/dymostore'
import { DymoLoader } from './io/dymoloader'
import { UIControl } from './controls/uicontrol'

/**
 * A class for easy access of all dymo core functionality.
 * TODO GET RID OF SCOPE!!! MAKE UICONTROLS CALL AN UPDATEFUNCTION!!!!
 * @param {Object=} $scope angular scope (optional, uicontrols will call $scope.$apply())
 * @param {Function=} onPlaybackChange (optional)
 */
export class DymoManager {

	private scheduler;
	private topDymos;
	private rendering;
	private uiControls = {};
	private sensorControls = {};
	private mappings = {};
	private reverbFile;
	private $scope;

	constructor(audioContext, scheduleAheadTime, optimizedMode, reverbFile, callback, $scope?, onPlaybackChange?) {
		GlobalVars.DYMO_STORE = new DymoStore(callback);
		this.scheduler = new Scheduler(audioContext, onPlaybackChange);
		if (optimizedMode) {
			GlobalVars.OPTIMIZED_MODE = true;
		}
		if (!isNaN(scheduleAheadTime)) {
			GlobalVars.SCHEDULE_AHEAD_TIME = scheduleAheadTime;
		}
		this.reverbFile = reverbFile;
		this.$scope = $scope;
	}

	loadDymoAndRenderingFromStore(newStore, dymoCallback, buffersCallback) {
		GlobalVars.DYMO_STORE = newStore;
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		var dymo = loader.createDymoFromStore();
		var rendering = loader.createRenderingFromStore();
		if (dymoCallback) {
			dymoCallback();
		}
		this.processLoadedDymoAndRendering(loader, dymo, rendering, buffersCallback);
	}

	loadDymoAndRendering(dymoUri, renderingUri, dymoCallback, buffersCallback) {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		loader.loadDymoFromJson(dymoUri, function(loadedDymos) {
			loader.loadRenderingFromJson(renderingUri, function(loadedRendering) {
				this.processLoadedDymoAndRendering(loader, loadedDymos, loadedRendering, buffersCallback);
				if (dymoCallback) {
					dymoCallback();
				}
			});
		});
	}

	private processLoadedDymoAndRendering(loader, loadedDymos, loadedRendering, buffersCallback) {
		this.topDymos = loadedDymos;
		this.rendering = loadedRendering[0];
		this.mappings = loader.getMappings();
		for (var key in loadedRendering[1]) {
			var currentControl = loadedRendering[1][key];
			if (GlobalVars.DYMO_STORE.isSubclassOf(currentControl.getType(), uris.UI_CONTROL)) {
				this.uiControls[key] = new UIControl(currentControl, this.$scope);
			}
			if (GlobalVars.DYMO_STORE.isSubclassOf(currentControl.getType(), uris.SENSOR_CONTROL)) {
				this.sensorControls[key] = currentControl;
			}
		}
		if (!this.reverbFile) {
			this.reverbFile = 'bower_components/dymo-core/audio/impulse_rev.wav';
		}
		this.scheduler.init(this.reverbFile, loadedDymos, buffersCallback);
	}

	loadDymoFromJson(jsonDymo, callback) {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		loader.loadDymoFromJson(jsonDymo, callback);
	}

	parseDymoFromJson(jsonDymo, callback) {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		loader.parseDymoFromJson(jsonDymo, callback);
	}

	replacePartOfTopDymo(index, dymoUri) {
		var oldDymo = GlobalVars.DYMO_STORE.replacePartAt(this.topDymos[0], dymoUri, index);
		this.scheduler.stop(oldDymo);
	}

	updateNavigatorPosition(dymoUri, level, position) {
		this.scheduler.updateNavigatorPosition(dymoUri, level, position);
	}

	getNavigatorPosition(dymoUri, level) {
		return this.scheduler.getNavigatorPosition(dymoUri, level);
	}

	//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	syncNavigators(syncDymo, goalDymo, level) {
		this.scheduler.syncNavigators(syncDymo, goalDymo, level);
	}

	startPlayingUri(dymoUri) {
		this.scheduler.play(dymoUri);
	}

	stopPlayingUri(dymoUri) {
		this.scheduler.stop(dymoUri);
	}

	startPlaying() {
		for (var i = 0; i < this.topDymos.length; i++) {
			GlobalVars.DYMO_STORE.updatePartOrder(this.topDymos[i], uris.ONSET); //TODO WHERE TO PUT THIS??
			this.scheduler.play(this.topDymos[i], this.rendering.getNavigator());
		}
	}

	stopPlaying() {
		for (var i = 0; i < this.topDymos.length; i++) {
			this.scheduler.stop(this.topDymos[i]);
		}
	}

	getStore() {
		return GlobalVars.DYMO_STORE;
	}

	getTopDymo() {
		return this.topDymos[0];
	}

	getRendering() {
		return this.rendering;
	}

	getMappings() {
		return this.mappings;
	}

	getUIControls() {
		return this.uiControls;
	}

	getUIControl(key) {
		return this.uiControls[key];
	}

	getSensorControls() {
		return this.sensorControls;
	}

}
