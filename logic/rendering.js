function Rendering(label) {
	
	var self = this;
	
	this.label = label;
	this.mappings = [];
	
	this.dmo = null;
	
	this.play = function() {
		this.dmo.play.update(undefined, 1);
	}
	
	this.stop = function() {
		this.dmo.play.update(undefined, 0);
	}
	
	this.addMapping = function(mapping) {
		this.mappings.push(mapping);
		mapping.updateParameter();
	}
	
	/*this.addFeatureMapping = function(dmo, feature, mappingFunction, parameter, level) {
		for (var i = 0; i < dmo.graph.nodes.length; i++) {
			var currentDmo = dmo.getRealDmo(dmo.graph.nodes[i]);
			if (isNaN(level) || currentDmo.getLevel() == level) {
				var value = mappingFunction(currentDmo.getFeature(feature.name));
				if (parameter.name == "Amplitude") {
					currentDmo.amplitude.update(undefined, value);
				} else if (parameter.name == "Pan") {
					currentDmo.pan.update(undefined, value);
				} else if (parameter.name == "Distance") {
					currentDmo.distance.update(undefined, value);
				} else if (parameter.name == "PlaybackRate") {
					currentDmo.playbackRate.update(undefined, value);
				} else if (parameter.name == "Reverb") {
					currentDmo.reverb.update(undefined, value);
				} else if (parameter.name == "DurationRatio") {
					currentDmo.durationRatio.update(undefined, value);
				} else if (parameter.name == "PartIndex") {
					currentDmo.partIndex.update(undefined, value);
				} else if (parameter.name == "PartCount") {
					currentDmo.partCount.update(undefined, value);
				} else if (parameter.name == "PartOrder") {
					currentDmo.updatePartOrder(feature.name);
				}
			}
		}
	}*/

}
