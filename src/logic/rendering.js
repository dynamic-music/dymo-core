/**
 * A rendering defines how a given dymo is played back.
 * @constructor
 */
function Rendering(dymo) {
	
	var self = this;
	
	var mappings = [];
	var navigators = [];
	
	this.play = function() {
		if (dymo) {
			dymo.getParameter(PLAY).update(1);
		}
	}
	
	this.stop = function() {
		if (dymo) {
			dymo.getParameter(PLAY).update(0);
		}
	}
	
	this.addMapping = function(mapping) {
		mappings.push(mapping);
		mapping.updateParameter();
	}
	
	this.getMappings = function() {
		return mappings;
	}
	
	this.addNavigator = function(dymos, navigator) {
		navigators.push([dymos, navigator]);
	}
	
	this.toJson = function() {
		var json = {"mappings":[],"navigators":[]};
		if (dymo) {
			json["topDymo"] = dymo.getUri();
		}
		for (var i = 0; i < mappings.length; i++) {
			json["mappings"].push(mappings[i].toJson());
		}
		for (var i = 0; i < mappings.length; i++) {
			json["navigators"].push({
				"dymos":navigators[i][0],
				"type":navigators[i][1].getType()
			});
		}
		return json;
	}
	
	function navigatorToJson() {
		
	}

}
