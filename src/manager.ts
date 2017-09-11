import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { GlobalVars } from './globals/globals'
import * as uris from './globals/uris'
import { Rendering } from './model/rendering'
import { AudioBank } from './audio/audio-bank';
import { Scheduler } from './audio/scheduler'
import { DymoStore } from './io/dymostore'
import { DymoLoader, LoadedStuff } from './io/dymoloader'
import { Control } from './model/control'
import { UIControl } from './controls/uicontrol'
import { SensorControl } from './controls/sensorcontrol'
import { JsonGraphSubject, JsonGraph } from './io/jsongraph'
import { AttributeInfo } from './globals/types';

function createAudioContext(): AudioContext {
	const audioCtxCtor = typeof AudioContext !== 'undefined' ?
		AudioContext : null;
	return new (
		audioCtxCtor
		|| (window as any).AudioContext
		|| (window as any).webkitAudioContext
	)();
}

/**
 * A class for easy access of all dymo core functionality.
 */
export class DymoManager {

	private store: DymoStore;
	private loader: DymoLoader;
	private scheduler: Scheduler;
	private audioBank: AudioBank;
	private dymoUris: string[] = [];
	private rendering;
	private uiControls: UIControl[] = [];
	private sensorControls = {};
	private reverbFile;
	private graphs: JsonGraphSubject[] = [];
	private attributeInfo: BehaviorSubject<AttributeInfo[]> = new BehaviorSubject([]);

	constructor(audioContext = createAudioContext(), scheduleAheadTime?: number, fadeLength?: number, optimizedMode?: boolean, reverbFile?: string) {
		this.store = new DymoStore();
		this.loader = new DymoLoader(this.store);
		this.audioBank = new AudioBank(audioContext);
		this.scheduler = new Scheduler(audioContext, this.audioBank, this.store);
		if (optimizedMode) {
			GlobalVars.OPTIMIZED_MODE = true;
		}
		if (!isNaN(scheduleAheadTime)) {
			GlobalVars.SCHEDULE_AHEAD_TIME = scheduleAheadTime;
		}
		if (!isNaN(fadeLength)) {
			GlobalVars.FADE_LENGTH = fadeLength;
		}
		this.reverbFile = reverbFile;
	}

	init(ontologiesPath?: string): Promise<any> {
		return new Promise((resolve, reject) => {
			this.store.loadOntologies(ontologiesPath)
				.then(r => resolve());
		});
	}

	getAudioBank(): AudioBank {
		return this.audioBank;
	}

	getPlayingDymoUris(): Observable<string[]> {
		return this.scheduler.getPlayingDymoUris();
	}

	getJsonGraph(nodeClass, edgeProperty, cacheNodes?: boolean): Observable<JsonGraph> {
		let newGraph = new JsonGraphSubject(nodeClass, edgeProperty, this.store, cacheNodes);
		this.graphs.push(newGraph);
		return newGraph.asObservable();
	}

	getAttributeInfo(): Observable<AttributeInfo[]> {
		return this.attributeInfo.asObservable();
	}

	loadDymoAndRendering(dymoFile, renderingFile): Promise<any> {
		return this.loader.loadIntoStore(dymoFile, renderingFile)
			.then(() => this.loadFromStore())
			.catch(err => console.log(err));
	}

	loadFromStore(...uris: string[]): Promise<LoadedStuff> {
		let loadedStuff = this.loader.loadFromStore(...uris);
		return this.processLoadedStuff(loadedStuff).then(() => loadedStuff);
	}

	private processLoadedStuff(loadedStuff: LoadedStuff): Promise<any> {
		this.dymoUris = this.dymoUris.concat(loadedStuff.dymoUris);
		this.rendering = loadedStuff.rendering;
		this.uiControls = <UIControl[]>(_.values(loadedStuff.controls)).filter(c => c instanceof UIControl);
		this.sensorControls = <SensorControl[]>_.values(loadedStuff.controls).filter(c => c instanceof SensorControl);

		if (!this.reverbFile) {
			this.reverbFile = 'node_modules/dymo-core/audio/impulse_rev.wav';
		}
		this.graphs.forEach(g => g.update());
		this.attributeInfo.next(this.store.getAttributeInfo());
		return this.scheduler.init(this.reverbFile, loadedStuff.dymoUris);
	}

	loadDymoFromJson(fileUri: string): Promise<string[]> {
		return new DymoLoader(this.store).loadFromFiles(fileUri)
			.then(loadedStuff => loadedStuff.dymoUris);
	}

	replacePartOfTopDymo(index, dymoUri) {
		var oldDymo = this.store.replacePartAt(this.dymoUris[0], this.addContext(dymoUri), index);
		this.scheduler.stop(oldDymo);
	}

	updateNavigatorPosition(dymoUri, level, position) {
		this.scheduler.updateNavigatorPosition(this.addContext(dymoUri), level, position);
	}

	getNavigatorPosition(dymoUri): number {
		return this.scheduler.getNavigatorPosition(this.addContext(dymoUri));
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
		const nav = this.rendering ? this.rendering.getNavigator() : undefined;
		this.dymoUris.forEach(d => this.scheduler.play(d, nav));
	}

	stopPlaying() {
		this.dymoUris.forEach(d => this.scheduler.stop(d));
	}

	getStore() {
		return this.store;
	}

	getTopDymo() {
		return this.dymoUris[0];
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
