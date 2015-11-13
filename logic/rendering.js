function Rendering(dymo) {
	
	var self = this;
	
	var mappings = [];
	
	this.play = function() {
		if (dymo) {
			dymo.getParameter(PLAY).update(undefined, 1);
		}
	}
	
	this.stop = function() {
		if (dymo) {
			dymo.getParameter(PLAY).update(undefined, 0);
		}
	}
	
	this.addMapping = function(mapping) {
		mappings.push(mapping);
		mapping.updateParameter();
	}
	
	this.getMappings = function() {
		return mappings;
	}
	
	this.toJson = function() {
		var json = {"topDymo":dymo.getUri(),"mappings":[]};
		for (var i = 0; i < mappings.length; i++) {
			json["mappings"].push(mappings[i].toJson());
		}
		return json;
	}

}
