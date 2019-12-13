import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { Fetcher } from './util/fetcher';
import { Rendering } from './model/rendering';
import { SuperStorePromiser } from './io/superstore-promiser';
import { DymoLoader, LoadedStuff } from './io/dymoloader';
import { UIControl } from './controls/uicontrol';
import { SensorControl } from './controls/sensorcontrol';
import { WeatherControl } from './controls/data/weathercontrol';
import { JsonGraphSubject } from './io/jsongraph';
import { AttributeInfo, JsonGraph, SuperDymoStore } from './globals/types';

/**
 * A class for easy access of all dymo core functionality.
 */
export class DymoManager {

	private store: SuperDymoStore;
	private loader: DymoLoader;
	private dymoUris: string[] = [];
	private rendering: Rendering;
	private uiControls: UIControl[] = [];
	private sensorControls: SensorControl[] = [];
	private weatherControls: WeatherControl[] = [];
	private graphs: JsonGraphSubject[] = [];
	private attributeInfo: BehaviorSubject<AttributeInfo[]> = new BehaviorSubject([]);

	constructor(dymoStore?: SuperDymoStore, fetcher?: Fetcher) {
		this.store = dymoStore ? dymoStore : new SuperStorePromiser(fetcher);
		this.loader = new DymoLoader(this.store, fetcher);
	}

	init(ontologiesPath?: string): Promise<any> {
		return new Promise(resolve => {
			this.store.loadOntologies(ontologiesPath)
				.then(() => resolve());
		});
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

	async loadIntoStoreFromString(rdf: string): Promise<LoadedStuff> {
		return this.processLoadedStuff(await this.loader.loadFromString(rdf));
	}

	loadDymoFromJson(fileUri: string): Promise<LoadedStuff> {
		return this.loader.loadFromFiles(fileUri)
			.then(loadedStuff => this.processLoadedStuff(loadedStuff));
	}

	async loadFromStore(...uris: string[]): Promise<LoadedStuff> {
		let loadedStuff = await this.loader.loadFromStore(...uris);
		return this.processLoadedStuff(loadedStuff);
	}

	private async processLoadedStuff(loadedStuff: LoadedStuff): Promise<LoadedStuff> {
		this.dymoUris = this.dymoUris.concat(loadedStuff.dymoUris);
		this.rendering = loadedStuff.rendering;
		this.uiControls = <UIControl[]>(_.values(loadedStuff.controls)).filter(c => c instanceof UIControl);
		this.sensorControls = <SensorControl[]>_.values(loadedStuff.controls).filter(c => c instanceof SensorControl);
		this.weatherControls = <WeatherControl[]>_.values(loadedStuff.controls).filter(c => c instanceof WeatherControl);
		this.graphs.forEach(g => g.update());
		this.store.getAttributeInfo().then(info => this.attributeInfo.next(info));
		return loadedStuff;
	}

	//TODO REMOVE THIS FUNCTION SOMETIME!
	getStore(): SuperDymoStore {
		return this.store;
	}

	getLoadedDymoUris(): string[] {
		return this.dymoUris;
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
	
	getWeatherControls() {
		return this.weatherControls;
	}

}
