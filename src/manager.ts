import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { ScheduloScheduler } from './audio/schedulo';
import { GlobalVars } from './globals/globals'
import * as uris from './globals/uris'
import { Fetcher, FetchFetcher } from './util/fetcher'
import { DymoPlayer } from './audio/player';
import { Rendering } from './model/rendering'
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
	private player: DymoPlayer;
	private scheduler: ScheduloScheduler;
	private dymoUris: string[] = [];
	private rendering: Rendering;
	private uiControls: UIControl[] = [];
	private sensorControls: SensorControl[] = [];
	private reverbFile: string;
	private graphs: JsonGraphSubject[] = [];
	private attributeInfo: BehaviorSubject<AttributeInfo[]> = new BehaviorSubject([]);

	constructor(audioContext = createAudioContext(), scheduleAheadTime?: number, fadeLength?: number, optimizedMode?: boolean, reverbFile?: string, fetcher: Fetcher = new FetchFetcher()) {
		this.store = new DymoStore(fetcher);
		this.loader = new DymoLoader(this.store, fetcher);
		this.scheduler = new ScheduloScheduler();
		this.player = new DymoPlayer(this.store, this.scheduler);
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

	getPlayingDymoUris(): Observable<string[]> {
		return this.player.getPlayingDymoUris();
	}

	getJsonGraph(nodeClass, edgeProperty, cacheNodes?: boolean): Observable<JsonGraph> {
		let newGraph = new JsonGraphSubject(nodeClass, edgeProperty, this.store, cacheNodes);
		this.graphs.push(newGraph);
		return newGraph.asObservable();
	}

	getAttributeInfo(): Observable<AttributeInfo[]> {
		return this.attributeInfo.asObservable();
	}

	loadIntoStore(...fileUris: string[]): Promise<LoadedStuff> {
		return this.loader.loadIntoStore(...fileUris)
			.then(() => this.loadFromStore());
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
		//return this.player.init(this.reverbFile, loadedStuff.dymoUris);
		return Promise.resolve();
	}

	loadDymoFromJson(fileUri: string): Promise<string[]> {
		return this.loader.loadFromFiles(fileUri)
			.then(loadedStuff => loadedStuff.dymoUris);
	}

	replacePartOfTopDymo(index, dymoUri) {
		var oldDymo = this.store.replacePartAt(this.dymoUris[0], this.addContext(dymoUri), index);
		this.player.stop(oldDymo);
	}

	getAudioBank() {
		return this.scheduler.getAudioBank();
	}

	getPosition(dymoUri: string) {
		return this.player.getPosition(dymoUri);
	}

	/*updateNavigatorPosition(dymoUri, level, position) {
		this.player.updateNavigatorPosition(this.addContext(dymoUri), level, position);
	}*/

	/*getNavigatorPosition(dymoUri): number {
		return this.player.getNavigatorPosition(this.addContext(dymoUri));
	}*/

	/*//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	syncNavigators(syncDymo, goalDymo, level) {
		this.scheduler.syncNavigators(this.addContext(syncDymo), this.addContext(goalDymo), level);
	}*/

	startPlayingUri(dymoUri) {
		this.player.play(this.addContext(dymoUri));
	}

	stopPlayingUri(dymoUri) {
		this.player.stop(this.addContext(dymoUri));
	}

	private addContext(uri: string): string {
		return uri.indexOf(uris.CONTEXT_URI) < 0 ? uris.CONTEXT_URI + uri : uri;
	}

	startPlaying() {
		if (this.rendering) {
			this.rendering.play();
		} else {
			this.dymoUris.forEach(d => this.player.play(d));
		}
	}

	stopPlaying() {
		if (this.rendering) {
			this.rendering.stop();
		} else {
			this.dymoUris.forEach(d => this.player.stop(d));
		}
	}

	getStore(): DymoStore {
		return this.store;
	}

	getTopDymo(): string {
		return this.dymoUris[0];
	}

	getRendering(): Rendering {
		return this.rendering;
	}

	getUIControls(): UIControl[] {
		return this.uiControls;
	}

	getSensorControls() {
		return this.sensorControls;
	}

}
