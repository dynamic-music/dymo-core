/**
 * Data controls that fetch data online to set their values.
 */
class DataControl extends AutoControl {

	/**
	 * @param {number=} frequency (optional)
	 */
	constructor(uri, url, jsonMap, frequency) {
		if (!frequency) frequency = 60000;
		super(uri, DATA_CONTROL, frequency);
		this.url = url;
		this.jsonMap = jsonMap;
		DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
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
