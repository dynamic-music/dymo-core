import { DataControl } from '../datacontrol';
import { DymoStore } from '../../io/dymostore';
import { Fetcher } from '../../util/fetcher';

/**
 * A control based on weather data
 */
export class WeatherControl extends DataControl {

	constructor(uri: string, store: DymoStore, fetcher?: Fetcher) {
		var WEATHER_KEY = "3d77879a046ee9e970e66bb2f5c5200d";
		var API_URL = `http://api.openweathermap.org/data/2.5/weather?appid=${WEATHER_KEY}`;
		super(uri, API_URL+"&q=london", j => j["main"]["temp"], store, fetcher);
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
