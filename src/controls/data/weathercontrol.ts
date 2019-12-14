import { DataControl } from '../datacontrol';
import { SuperDymoStore } from '../../globals/types';
import { Fetcher } from '../../util/fetcher';

const WEATHER_KEY = "3d77879a046ee9e970e66bb2f5c5200d";
const API_URL = `http://api.openweathermap.org/data/2.5/weather?appid=${WEATHER_KEY}`;

/**
 * A control based on weather data
 */
export class WeatherControl extends DataControl {

	constructor(uri: string, jsonMap: (json: {}) => number, store: SuperDymoStore, fetcher?: Fetcher) {
		super(uri, API_URL+"&q=london", jsonMap, store, fetcher);
	}
	
	setLocation(latitude: number, longitude: number) {
		this.setUrl(API_URL+"&lat="+latitude+"&lon="+longitude);
		this.startUpdate();
	}

	/*constructor(uri) {
		var WEATHER_KEY = "3d77879a046ee9e970e66bb2f5c5200d";
		var API_URL = `http://api.openweathermap.org/data/2.5/weather?appid=${WEATHER_KEY}`;
		super(uri, "WeatherControl", API_URL+"&q=london", (j) => j.main.temp);
	}*/

	/*constructor(uri) {
		var API_URL = `https://api.github.com/events`;
		super(uri, "UsersControl", API_URL, (j) => j.filter(function(e){return e.type == "PushEvent"}).length);
	}*/

	/*constructor(uri) {
		var MEETUP_KEY = "d3239d92c114248435b5e2a236e26";
		var API_URL = `https://api.meetup.com/2/open_events?key=${MEETUP_KEY}&category=1&order=time&desc=false&page=2`;
		super(uri, "UsersControl", API_URL, (j) => j.results[0].name);
	}*/

}
