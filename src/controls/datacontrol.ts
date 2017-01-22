import { DATA_CONTROL, AUTO_CONTROL_TRIGGER } from '../globals/uris'
import { AutoControl } from './autocontrol'
import { GlobalVars } from '../globals/globals'

/**
 * Data controls that fetch data online to set their values.
 */
export class DataControl extends AutoControl {

	private url;
	private jsonMap;

	constructor(uri, url, jsonMap, frequency?: number) {
		if (!frequency) frequency = 60000;
		super(uri, DATA_CONTROL, frequency);
		this.url = url;
		this.jsonMap = jsonMap;
		GlobalVars.DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		fetch(this.url)
		.then(res => res.json())
		.then(json => this.jsonMap(json))
		.then(mapped => {
			console.log("data received:", mapped);
			this.updateValue(mapped)
		})
		.catch(e => console.log(e));
	}

}
