import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { GlobalVars } from './globals/globals'
import * as uris from './globals/uris'
import { Scheduler } from './audio/scheduler'
import { DymoStore } from './io/dymostore'
import { DymoLoader } from './io/dymoloader'
import { UIControl } from './controls/uicontrol'
import { JsonGraphSubject, JsonGraph } from './io/jsongraph'
import { AttributeInfo } from './globals/types';

/**
 * A class for easy access of all dymo core functionality.
 */
export class DymoManager {

	private scheduler: Scheduler;
	private topDymos;
	private rendering;
	private uiControls: UIControl[] = [];
	private sensorControls = {};
	private reverbFile;
	private graphs: JsonGraphSubject[] = [];
	private attributeInfo: BehaviorSubject<AttributeInfo[]> = new BehaviorSubject([]);

	constructor(audioContext, scheduleAheadTime, optimizedMode, reverbFile) {
		GlobalVars.DYMO_STORE = new DymoStore();
		this.scheduler = new Scheduler(audioContext);
		if (optimizedMode) {
			GlobalVars.OPTIMIZED_MODE = true;
		}
		if (!isNaN(scheduleAheadTime)) {
			GlobalVars.SCHEDULE_AHEAD_TIME = scheduleAheadTime;
		}
		this.reverbFile = reverbFile;
	}

	init(ontologiesPath?: string): Promise<any> {
		return new Promise((resolve, reject) => {
			GlobalVars.DYMO_STORE.loadOntologies(ontologiesPath)
				.then(r => resolve());
		});
	}

	getPlayingDymoUris(): Observable<string[]> {
		return this.scheduler.getPlayingDymoUris();
	}

	reloadFromStore(): Promise<any> {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		var dymo = loader.createDymoFromStore();
		var rendering = loader.createRenderingFromStore();
		return this.processLoadedDymoAndRendering(loader, dymo, rendering);
	}

	getJsonGraph(nodeClass, edgeProperty, cacheNodes?: boolean): Observable<JsonGraph> {
		let newGraph = new JsonGraphSubject(nodeClass, edgeProperty, GlobalVars.DYMO_STORE, cacheNodes);
		this.graphs.push(newGraph);
		return newGraph.asObservable();
	}

	getAttributeInfo(): Observable<AttributeInfo[]> {
		return this.attributeInfo.asObservable();
	}

	loadDymoAndRendering(dymoUri, renderingUri): Promise<any> {
		let loader = new DymoLoader(GlobalVars.DYMO_STORE);
		let loadedDymos, loadedRendering;
		return loader.loadDymoFromFile(dymoUri)
			.then(res => loadedDymos = res)
			.then(() => loader.loadRenderingFromFile(renderingUri))
			.then(res => loadedRendering = res)
			.then(() => this.processLoadedDymoAndRendering(loader, loadedDymos, loadedRendering))
			.catch(err => console.log(err));
	}

	private processLoadedDymoAndRendering(loader, loadedDymos, loadedRendering): Promise<any> {
		this.topDymos = loadedDymos;
		this.rendering = loadedRendering[0];
		for (var key in loadedRendering[1]) {
			var currentControl = loadedRendering[1][key];
			if (GlobalVars.DYMO_STORE.isSubclassOf(currentControl.getType(), uris.UI_CONTROL)) {
				this.uiControls.push(new UIControl(currentControl));
			}
			if (GlobalVars.DYMO_STORE.isSubclassOf(currentControl.getType(), uris.SENSOR_CONTROL)) {
				this.sensorControls[key] = currentControl;
			}
		}
		if (!this.reverbFile) {
			this.reverbFile = 'node_modules/dymo-core/audio/impulse_rev.wav';
		}
		this.graphs.forEach(g => g.update());
		this.attributeInfo.next(GlobalVars.DYMO_STORE.getAttributeInfo());
		return this.scheduler.init(this.reverbFile, loadedDymos);
	}

	loadDymoFromJson(jsonDymo): Promise<string[]> {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		return loader.loadDymoFromFile(jsonDymo);
	}

	parseDymoFromJson(jsonDymo): Promise<string[]> {
		var loader = new DymoLoader(GlobalVars.DYMO_STORE);
		return loader.parseDymoFromString(jsonDymo);
	}

	replacePartOfTopDymo(index, dymoUri) {
		var oldDymo = GlobalVars.DYMO_STORE.replacePartAt(this.topDymos[0], this.addContext(dymoUri), index);
		this.scheduler.stop(oldDymo);
	}

	updateNavigatorPosition(dymoUri, level, position) {
		this.scheduler.updateNavigatorPosition(this.addContext(dymoUri), level, position);
	}

	getNavigatorPosition(dymoUri, level) {
		return this.scheduler.getNavigatorPosition(this.addContext(dymoUri), level);
	}

	//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	syncNavigators(syncDymo, goalDymo, level) {
		this.scheduler.syncNavigators(this.addContext(syncDymo), this.addContext(goalDymo), level);
	}

	startPlayingUri(dymoUri) {
		this.scheduler.play(this.addContext(dymoUri));
	}

	stopPlayingUri(dymoUri) {
		this.scheduler.stop(this.addContext(dymoUri));
	}

	private addContext(uri) {
		return uri.indexOf(uris.CONTEXT_URI) < 0 ? uris.CONTEXT_URI + uri : uri;
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

	getUIControls(): UIControl[] {
		return this.uiControls;
	}

	getSensorControls() {
		return this.sensorControls;
	}

}
