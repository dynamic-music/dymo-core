import { DATA_CONTROL, AUTO_CONTROL_TRIGGER } from '../globals/uris';
import { SuperDymoStore } from '../globals/types';
import { AutoControl } from './autocontrol';
import { Fetcher, FetchFetcher } from '../util/fetcher';

/**
 * Data controls that fetch data online to set their values.
 */
export class DataControl extends AutoControl {

	private url: string;
	private jsonMap: (json: {}) => number;

	constructor(uri, url: string, jsonMap: (json: {}) => number,
			store: SuperDymoStore, private fetcher: Fetcher = new FetchFetcher()) {
		super(uri, DATA_CONTROL, store);
		this.frequency = 60000;
		this.url = url;
		this.jsonMap = jsonMap;
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 1);
	}
	
	setUrl(url: string) {
		this.url = url;
	}

	async update() {
		try {
			const data = this.jsonMap(await this.fetcher.fetchJson(this.url));
			console.log("data received:", data, JSON.stringify(this.jsonMap.toString()));
			this.updateValue(data);
		} catch(e) {
			console.log("unable to get data", e);
		}
	}

}
