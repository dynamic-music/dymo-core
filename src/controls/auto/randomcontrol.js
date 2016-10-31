/**
 * Autocontrols that use statistics to set their values.
 * @constructor
 * @extends {AutoControl}
 */
function RandomControl(uri) {

	var self = this;

	AutoControl.call(this, uri, RANDOM, function() {
		self.update(Math.random());
	});
	this.startUpdate();

}
inheritPrototype(RandomControl, AutoControl);
