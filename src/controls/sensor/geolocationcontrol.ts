import { SensorControl } from '../sensorcontrol';
import { GEOLOCATION_LATITUDE } from '../../globals/uris';
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on geolocation sensors (controlName is either GEOLOCATION_LATITUDE or GEOLOCATION_LONGITUDE)
 */
export class GeolocationControl extends SensorControl {

	constructor(controlName: string, store: DymoStore) {
		super(controlName,
			"$cordovaGeolocation",
			"watchPosition",
			position => {
				var newValue;
				if (controlName == GEOLOCATION_LATITUDE) {
					newValue = position.coords.latitude;
				} else {
					newValue = position.coords.longitude;
				}
				this.updateValue(newValue);
			},
			store,
			() => this.resetReferenceValueAndAverage(),
			{
				enableHighAccuracy: true,
				timeout: 30000,
				maximumAge: 3000
			}
		);
		//this.setReferenceAverageOf(10);
		//this.setAverageOf(10);
	}

}
