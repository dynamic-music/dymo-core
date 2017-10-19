import { SensorControl } from '../sensorcontrol'
import { BEACON } from '../../globals/uris'
import { DymoStore } from '../../io/dymostore';

/**
 * A control based on the distance from a bluetooth beacon
 */
export class BeaconControl extends SensorControl {

	private uuid;
	private major;
	private minor;

	constructor(uuid, major, minor, store: DymoStore) {
		super(null, BEACON,
			"$cordovaBeacon",
			null,
			function() {},
			store
		);
		this.uuid = uuid;
		this.major = major;
		this.minor = minor;
	}

	startUpdate() {
		/*let region = this.getSensor().createBeaconRegion("smpBeacons", this.uuid)
		this.getSensor().startRangingBeaconsInRegion(region);
		this.getScope().$on("$cordovaBeacon:didRangeBeaconsInRegion", (event, region) => {
			for (let b in region.beacons) {
				let currentB = region.beacons[b];
				if (currentB.major == this.major && currentB.minor == this.minor) {
					this.updateValue(currentB.accuracy);
				}
			}
		});*/
	}

}
