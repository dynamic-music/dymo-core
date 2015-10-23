function DynamicMusicObject(uri, scheduler, type) {
	
	var parentDMO = null;
	var parts = [];
	var partsPlayed = 0;
	var isPlaying = false;
	var sourcePath;
	var graph = null;
	var skipProportionAdjustment = false;
	var previousIndex = null;
	var features = {};
	
	features["level"] = 0;
	
	this.getUri = function() {
		return uri;
	}
	
	this.setParent = function(dmo) {
		parentDMO = dmo;
	}
	
	this.getParent = function() {
		return parentDMO;
	}
	
	this.getLevel = function() {
		if (parentDMO) {
			return parentDMO.getLevel()+1;
		}
		return 0;
	}
	
	this.addPart = function(dmo) {
		dmo.setParent(this);
		parts.push(dmo);
		dmo.setFeature("level", this.getLevel()+1);
	}
	
	this.getParts = function() {
		return parts;
	}
	
	this.setSourcePath = function(path) {
		sourcePath = path;
		if (path) {
			scheduler.addSourceFile(path);
		}
	}
	
	this.getSourcePath = function() {
		if (parentDMO && !sourcePath) {
			return parentDMO.getSourcePath();
		}
		return sourcePath;
	}
	
	this.setFeature = function(name, value) {
		features[name] = value;
	}
	
	this.getFeature = function(name) {
		return features[name];
	}
	
	this.getSegment = function() {
		return [this.getFeature("time"), this.durationRatio.value*this.getFeature("duration")];
	}
	
	this.getParameter = function(parameterName) {
		if (parameterName == "Amplitude") {
			return this.amplitude;
		} else if (parameterName == "Pan") {
			return this.pan;
		} else if (parameterName == "Distance") {
			return this.distance;
		} else if (parameterName == "PlaybackRate") {
			return this.playbackRate;
		} else if (parameterName == "Reverb") {
			return this.reverb;
		} else if (parameterName == "DurationRatio") {
			return this.durationRatio;
		} else if (parameterName == "Onset") {
			return this.onset;
		} else if (parameterName == "PartIndex") {
			return this.partIndex;
		} else if (parameterName == "PartCount") {
			return this.partCount;
		} else if (parameterName == "PartOrder") {
			return undefined;//this.updatePartOrder(feature.name);
		}
	}
	
	this.setGraph = function(g) {
		graph = g;
	}
	
	this.getGraph = function() {
		return graph;
	}
	
	//positive change in play affects parts
	this.updatePlay = function(change) {
		//ask their parts to get appropriate segment
		if (type == DmoTypes.SEQUENCE) {
			
		}
		if (parts.length > 0) {
			for (var i = 0; i < parts.length; i++) {
				parts[i].updatePlay(change);
			}
		} else {
			if (change > 0) {
				scheduler.play(this);
			} else {
				scheduler.stop(this);
			}
		}
	}
	
	//change in amplitude does not affect parts
	this.updateAmplitude = function(change) {
		scheduler.updateAmplitude(this, change);
		if (!sourcePath) {
			for (var i = 0; i < parts.length; i++) {
				parts[i].amplitude.relativeUpdate(change);
			}
		}
	}
	
	//change in amplitude does not affect parts
	this.updatePlaybackRate = function(change) {
		scheduler.updatePlaybackRate(this, change);
		if (!sourcePath) {
			for (var i = 0; i < parts.length; i++) {
				parts[i].playbackRate.relativeUpdate(change);
			}
		}
	}
	
	//change in pan affects pan of parts
	this.updatePan = function(change) {
		scheduler.updatePan(this, change);
		for (var i = 0; i < parts.length; i++) {
			parts[i].pan.relativeUpdate(change);
		}
	}
	
	//change in distance affects distance of parts
	this.updateDistance = function(change) {
		scheduler.updateDistance(this, change);
		for (var i = 0; i < parts.length; i++) {
			parts[i].distance.relativeUpdate(change);
		}
	}
	
	//change in reverb affects reverb of parts
	this.updateReverb = function(change) {
		scheduler.updateReverb(this, change);
		for (var i = 0; i < parts.length; i++) {
			parts[i].reverb.relativeUpdate(change);
		}
	}
	
	this.updatePartIndex = function(value) {
		partsPlayed = value;
	}
	
	this.resetPartsPlayed = function() {
		partsPlayed = 0;
		for (var i = 0; i < parts.length; i++) {
			parts[i].resetPartsPlayed();
		}
	}
	
	this.updatePartOrder = function(featureName) {
		parts.sort(function(p,q) {
			return p.getFeature(featureName) - q.getFeature(featureName);
		});
	}
	
	this.getNextPart = function() {
		if (parts.length > 0) {
			isPlaying = true;
			while (partsPlayed < parts.length && partsPlayed < this.partCount.value) {
				var nextPart = parts[partsPlayed].getNextPart();
				if (nextPart) {
					return nextPart;
				} else {
					partsPlayed++;
				}
			}
			//done playing
			partsPlayed = 0;
			isPlaying = false;
			return null;
		} else {
			if (!isPlaying) {
				isPlaying = true;
				return this;
			} else {
				isPlaying = false;
				return null;
			}
		}
	}
	
	
	this.play = new Parameter(this, this.updatePlay, 0, true);
	this.amplitude = new Parameter(this, this.updateAmplitude, 1);
	this.playbackRate = new Parameter(this, this.updatePlaybackRate, 1);
	this.pan = new Parameter(this, this.updatePan, 0);
	this.distance = new Parameter(this, this.updateDistance, 0);
	this.reverb = new Parameter(this, this.updateReverb, 0);
	this.partIndex = new Parameter(this, this.updatePartIndex, 0, true, true);
	this.onset = new Parameter(this, undefined, -1, false, true);
	this.durationRatio = new Parameter(this, undefined, 1, false, true);
	this.partCount = new Parameter(this, undefined, Number.POSITIVE_INFINITY, true, true);
	
	//creates a hierarchical json of this (recursively containing parts)
	this.toJsonHierarchy = function() {
		var jsonDymo = this.toFlatJson();
		for (var i = 0; i < parts.length; i++) {
			jsonDymo["parts"].push(parts[i].toJsonHierarchy());
		}
		return jsonDymo;
	}
	
	//creates basic representation of this with empty parts
	this.toFlatJson = function() {
		var jsonDymo = {
			"@id": uri,
			"@type": "DYMO",
			"parts": [],
			"source": sourcePath
		}
		for (featureName in features) {
			jsonDymo[featureName] = this.getFeatureJson(featureName);
		}
		return jsonDymo;
	}
	
	this.getFeatureJson = function(featureName) {
		return {
			"value" : features[featureName],
			"adt" : featureName.charAt(0).toUpperCase() + featureName.slice(1),
		};
	}
	
}