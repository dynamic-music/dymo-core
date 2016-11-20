/**
 * Data controls that fetch data online to set their values.
 */
class DataControl extends AutoControl {

	/**
	 * @param {number=} frequency (optional)
	 */
	constructor(uri, url, jsonMap, frequency) {
		if (!frequency) frequency = 1001;
		super(uri, DATA_CONTROL, frequency);
		this.url = url;
		this.jsonMap = jsonMap;
	}

	update() {
		fetch(this.url)
		.then(res => res.json())
		.then(json => this.jsonMap(json))
		.then(mapped => {
			console.log("data received:", mapped);
			this.updateValue(mapped)
		});
	}

}
