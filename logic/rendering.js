function Rendering(label) {
	
	var self = this;
	
	var label = label;
	var mappings = [];
	
	this.dmo = null;
	
	this.play = function() {
		this.dmo.play.update(undefined, 1);
	}
	
	this.stop = function() {
		this.dmo.play.update(undefined, 0);
	}
	
	this.addMapping = function(mapping) {
		mappings.push(mapping);
		mapping.updateParameter();
	}
	
	this.toJson = function() {
		var json = {"mappings":[]};
		for (var i = 0; i < mappings.length; i++) {
			json["mappings"].push(mappings[i].toJson());
		}
		return json;
	}

}
