import { DATA_CONTROL, AUTO_CONTROL_TRIGGER } from '../globals/uris';
import { GlobalVars } from '../globals/globals';
import { DymoStore } from '../io/dymostore';
import { AutoControl } from './autocontrol';

/**
 * Data controls that fetch data online to set their values.
 */
export class DataControl extends AutoControl {

	private url;
	private jsonMap;

	constructor(uri, url, jsonMap, store: DymoStore) {
		super(uri, DATA_CONTROL, store);
		this.frequency = 60000;
		this.url = url;
		this.jsonMap = jsonMap;
		this.store.setControlParam(this.uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		fetch(this.url)
		.then(res => res.json())
		.then(json => this.jsonMap(json))
		.then(mapped => {
			if (GlobalVars.LOGGING_ON) {
				console.log("data received:", mapped);
			}
			this.updateValue(mapped)
		})
		.catch(e => console.log(e));
	}

}
