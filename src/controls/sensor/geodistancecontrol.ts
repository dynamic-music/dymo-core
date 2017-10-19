import { SensorControl } from '../sensorcontrol'
import { GEOLOCATION_DISTANCE } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on geolocation distance
 */
export class DistanceControl extends SensorControl {

	private reference;

	constructor(store: DymoStore) {
		super(null, GEOLOCATION_DISTANCE,
			"$cordovaGeolocation",
			"watchPosition",
			position => {
				if (!this.reference) {
					this.reference = [position.coords.latitude, position.coords.longitude];
				} else {
					var currentDistance = this.latLonToMeters(this.reference[0], this.reference[1], position.coords.latitude, position.coords.longitude);
					this.updateValue(currentDistance);
				}
			},
			store,
			() => this.resetReferenceValueAndAverage(),
			{
				enableHighAccuracy: true,
				timeout: 30000,
				maximumAge: 3000
			}
		);
		this.setReferenceAverageOf(5);
		//this.setAverageOf(5);
	}

	private latLonToMeters(lat1, lon1, lat2, lon2){  // generally used geo measurement function :)
		var R = 6378.137; // Radius of earth in KM
		var dLat = (lat2 - lat1) * Math.PI / 180;
		var dLon = (lon2 - lon1) * Math.PI / 180;
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return d * 1000; // meters
	}

}
