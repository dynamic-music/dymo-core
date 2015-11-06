function DynamicMusicObject(uri, scheduler, type) {
	
	var self = this;
	
	var parentDMO = null;
	var parts = [];
	var partsPlayed = 0;
	var isPlaying = false;
	var sourcePath;
	var graph = null;
	var skipProportionAdjustment = false;
	var previousIndex = null;
	var features = {};
	var parameters = {};
	initFeaturesAndParameters();
	
	function initFeaturesAndParameters() {
		features["level"] = 0;
		parameters[PLAY] = new Parameter(this, updatePlay, 0, true);
		parameters[ONSET] = new Parameter(this, undefined, -1, false, true);
		parameters[DURATION_RATIO] = new Parameter(this, undefined, 1, false, true);
		parameters[AMPLITUDE] = new Parameter(this, updateAmplitude, 1);
		parameters[PLAYBACK_RATE] = new Parameter(this, updatePlaybackRate, 1);
		parameters[PAN] = new Parameter(this, updatePan, 0);
		parameters[DISTANCE] = new Parameter(this, updateDistance, 0);
		parameters[HEIGHT] = new Parameter(this, updateHeight, 0);
		parameters[REVERB] = new Parameter(this, updateReverb, 0);
		parameters[PART_INDEX] = new Parameter(this, updatePartIndex, 0, true, true);
		parameters[PART_COUNT] = new Parameter(this, undefined, Number.POSITIVE_INFINITY, true, true);
	}
	
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
		return [this.getFeature("time"), parameters[DURATION_RATIO].value*this.getFeature("duration")];
	}
	
	this.getParameter = function(parameterName) {
		if (parameterName == "ListenerOrientation") {
			return scheduler.listenerOrientation;
		} else if (parameterName == "PartOrder") {
			return undefined;//this.updatePartOrder(feature.name);
		}
		return parameters[parameterName];
	}
	
	this.setGraph = function(g) {
		graph = g;
	}
	
	this.getGraph = function() {
		return graph;
	}
	
	//positive change in play affects parts
	function updatePlay(change) {
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
	function updateAmplitude(change) {
		updateParameter(AMPLITUDE, change, true);
	}
	
	//change in amplitude does not affect parts
	function updatePlaybackRate(change) {
		updateParameter(PLAYBACK_RATE, change, true);
	}
	
	//change in pan affects pan of parts
	function updatePan(change) {
		updateParameter(PAN, change);
	}
	
	//change in distance affects distance of parts
	function updateDistance(change) {
		updateParameter(DISTANCE, change);
	}
	
	//change in distance affects distance of parts
	function updateHeight(change) {
		updateParameter(HEIGHT, change);
	}
	
	//change in reverb affects reverb of parts
	function updateReverb(change) {
		updateParameter(REVERB, change);
	}
	
	function updateParameter(name, change, onlyIfNoSource) {
		scheduler.updateParameter(self, name, change);
		if (!onlyIfNoSource || !sourcePath) {
			for (var i = 0; i < parts.length; i++) {
				parts[i].getParameter(name).relativeUpdate(change);
			}
		}
	}
	
	function updatePartIndex(value) {
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
			while (partsPlayed < parts.length && partsPlayed < parameters[PART_COUNT].value) {
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
			"@type": DYMO,
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