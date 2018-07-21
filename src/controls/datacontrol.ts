import { DATA_CONTROL, AUTO_CONTROL_TRIGGER } from '../globals/uris';
import { SuperDymoStore } from '../globals/types';
import { AutoControl } from './autocontrol';
import { Fetcher, FetchFetcher } from '../util/fetcher';

/**
 * Data controls that fetch data online to set their values.
 */
export class DataControl extends AutoControl {

	private url;
	private jsonMap;

	constructor(uri, url, jsonMap, store: SuperDymoStore, private fetcher: Fetcher = new FetchFetcher()) {
		super(uri, DATA_CONTROL, store);
		this.frequency = 60000;
		this.url = url;
		this.jsonMap = jsonMap;
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		this.fetcher.fetchJson(this.url)
		.then(json => this.jsonMap(json))
		.then(mapped => {
			console.log("data received:", mapped);
			this.updateValue(mapped)
		})
		.catch(e => console.log(e));
	}

}
