/**
 * Random control outputs random values between 0 and 1.
 */
class RandomControl extends AutoControl {

	constructor(uri) {
		super(uri, RANDOM);
		DYMO_STORE.setParameter(uri, AUTO_CONTROL_TRIGGER, 1);
	}

	update() {
		this.updateValue(Math.random());
	}

}
