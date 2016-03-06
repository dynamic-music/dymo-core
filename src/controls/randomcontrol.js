/**
 * Autocontrols that use statistics to set their values.
 * @constructor
 * @extends {AutoControl}
 */
function RandomControl() {
	
	var self = this;
	
	AutoControl.call(this, RANDOM, function() {
		self.update(Math.random());
	});
	this.startUpdate();
	
}
inheritPrototype(RandomControl, AutoControl);