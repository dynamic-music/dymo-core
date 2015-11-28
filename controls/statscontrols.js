function StatsControls() {
	
	var self = this;
	
	this.frequency = new Parameter(STATS_FREQUENCY, 300);
	this.frequency.addObserver(this);
	this.randomControl = new Control(RANDOM, AUTO_CONTROL);
	var intervalID;
	
	startUpdate();
	
	function startUpdate() {
		intervalID = setInterval(function() {
			self.randomControl.update(Math.random());
		}, self.frequency.getValue());
	}
	
	this.observedParameterChanged = function(param) {
		if (param.getName() == STATS_FREQUENCY) {
			clearInterval(intervalID);
			startUpdate();
		}
	}
	
}