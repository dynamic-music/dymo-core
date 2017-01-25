import { SUMMARY } from './globals'
import { CONTEXT_URI, TYPE, FEATURE_TYPE, LEVEL_FEATURE, TIME_FEATURE, DURATION_FEATURE } from '../globals/uris'
import { URI_TO_TERM } from '../globals/terms'

/**
 * Offers basic functions for generating dymos, inserts them into the given store.
 */
export class DymoGenerator {

	private store;
	private onFeatureAdded;
	private topDymo; //TODO REMOVE
	private currentTopDymo; //the top dymo for the current audio file
	private currentRenderingUri;
	private audioFileChanged;
	private features;
	private summarizingMode = SUMMARY.MEAN;
	private currentSourcePath;
	private dymoCount = 0;
	private renderingCount = 0;

	constructor(store, onFeatureAdded) {
		this.store = store;
		this.onFeatureAdded = onFeatureAdded;
		this.resetDymo();
	}

	resetDymo() {
		this.topDymo = undefined;
		this.currentTopDymo = undefined; //the top dymo for the current audio file
		this.audioFileChanged = false;
		this.features = [];
		this.internalAddFeature("level", LEVEL_FEATURE, 0, 2);
		this.internalAddFeature("random", null, 0, 1);
	}

	setStore(s) {
		this.store = s;
	}

	getStore() {
		return this.store;
	}

	addRendering() {
		this.currentRenderingUri = this.getUniqueRenderingUri();
		this.store.addRendering(this.currentRenderingUri, this.currentTopDymo);
	}

	addMapping(domainDims, mappingFunction, subsetOrFunction, rangeUri) {
		this.store.addMapping(domainDims, mappingFunction, subsetOrFunction, rangeUri);
	}

	addNavigator(navigatorType, subsetFunctionArgs, subsetFunctionBody) {
		this.store.addNavigator(this.currentRenderingUri, navigatorType, subsetFunctionArgs, subsetFunctionBody);
	}

	/*this.setDymo(dymo, dymoMap) {
		this.resetDymo();
		recursiveAddDymo(undefined, dymo);
	}*/

	getCurrentTopDymo() {
		return this.currentTopDymo;
	}

	getFeatures() {
		return this.features;
	}

	/*function recursiveAddDymo(parent, currentDymo) {
		var newDymo = this.addDymo(parent);
		var features = currentDymo.getFeatures();
		for (var name in features) {
			self.setDymoFeature(newDymo, name, features[name]);
		}
		self.setDymoFeature(newDymo, LEVEL_FEATURE, currentDymo.getLevel());
		var parts = currentDymo.getParts();
		for (var i = 0; i < parts.length; i++) {
			recursiveAddDymo(newDymo, parts[i]);
		}
	}*/

	setSummarizingMode(mode) {
		this.summarizingMode = mode;
	}

	setCurrentSourcePath(path) {
		this.currentSourcePath = path;
	}

	setAudioFileChanged() {
		this.audioFileChanged = true;
		if (this.currentTopDymo) {
			var dymoUri = this.getUniqueDymoUri();
			this.store.addDymo(dymoUri, null, this.currentTopDymo);
			this.currentTopDymo = dymoUri;
		}
	}

	addDymo(parentUri, sourcePath?: string, dymoType?: string, dymoUri?: string) {
		if (!dymoUri) {
			dymoUri = this.getUniqueDymoUri();
		}
		this.store.addDymo(dymoUri, parentUri, null, sourcePath, dymoType);
		if (!parentUri) {
			this.currentTopDymo = dymoUri;
		}
		return dymoUri;
	}

	private getUniqueDymoUri() {
		var dymoUri = CONTEXT_URI + "dymo" + this.dymoCount;
		this.dymoCount++;
		return dymoUri;
	}

	private getUniqueRenderingUri() {
		var renderingUri = CONTEXT_URI + "rendering" + this.renderingCount;
		this.renderingCount++;
		return renderingUri;
	}

	addFeature(name, data, dymoUri) {
		if (!dymoUri) {
			dymoUri = this.currentTopDymo;
		}
		//Benchmarker.startTask("addFeature")
		this.initTopDymoIfNecessary();
		var feature = this.getFeature(name);
		//iterate through all levels and add averages
		var dymos = this.store.findAllObjectsInHierarchy(dymoUri);
		for (var i = 0; i < dymos.length; i++) {
			var currentTime = this.store.findFeatureValue(dymos[i], TIME_FEATURE);
			var currentDuration = this.store.findFeatureValue(dymos[i], DURATION_FEATURE);
			var currentValues = data;
			if (!isNaN(currentTime)) {
				//only filter data id time given
				currentValues = currentValues.filter(
					function(x){return currentTime <= x.time && (isNaN(currentDuration) || x.time < currentTime+currentDuration);}
				);
			}
			//event-based feature:
			if (currentValues.length < 1) {
				var earlierValues = data.filter(
					function(x){return x.time.value <= currentTime}
				);
				if (earlierValues.length > 0) {
					currentValues = [earlierValues[currentValues.length-1]];
				} else {
					//set to first value
					currentValues = [data[0]];
				}
			}
			//Benchmarker.startTask("summarize")
			var value = this.getSummarizedValues(currentValues);
			/*if (typeof value == "string") {
				var labelFeature = getFeature(SEGMENT_LABEL);
				this.setDymoFeature(dymos[i], getFeature(SEGMENT_LABEL), value);
			}*/
			this.setDymoFeature(dymos[i], feature.uri, value);
		}
	}

	//summarizes the given vectors into one based on summarizingMode
	private getSummarizedValues(vectors) {
		var vector = [];
		if (vectors && vectors.length > 0) {
			for (var i = 0; i < vectors.length; i++) {
				if (vectors[i].value && vectors[i].value.constructor !== Array) {
					//console.log(vectors[i].value)
					vectors[i].value = [vectors[i].value];
				}
			}
			var dim = vectors[0].value.length;
			for (var k = 0; k < dim; k++) {
				if (typeof vectors[0].value[k] == "string") {
					vector[k] = vectors[0].value[k];
				} else if (this.summarizingMode == SUMMARY.FIRST) {
					vector[k] = vectors[0].value[k];
				} else if (this.summarizingMode == SUMMARY.MEAN) {
					vector[k] = vectors.reduce(function(sum, i) { return sum + i.value[k]; }, 0) / vectors.length;
				} else if (this.summarizingMode == SUMMARY.MEDIAN) {
					vectors.sort(function(a, b) { return a.value[k] - b.value[k]; });
					var middleIndex = Math.floor(vectors.length/2);
					vector[k] = vectors[middleIndex].value[k];
					if (vectors.length % 2 == 0) {
						vector[k] += vectors[middleIndex-1].value[k];
					}
				}
			}
			if (vector.length == 1) {
				return vector[0];
			}
			return vector;
		}
		return 0;
	}

	addSegmentation(segments, dymoUri) {
		this.initTopDymoIfNecessary();
		var maxLevel = this.store.findMaxLevel();
		for (var i = 0; i < segments.length; i++) {
			var parentUri = this.getSuitableParent(segments[i].time, maxLevel, dymoUri);
			var startTime = segments[i].time;
			var duration;
			if (segments[i].duration) {
				duration = segments[i].duration;
			} else if (segments[i+1]) {
				duration = segments[i+1].time - startTime;
			} else {
				var parentTime = this.store.findFeatureValue(parentUri, TIME_FEATURE);
				var parentDuration = this.store.findFeatureValue(parentUri, DURATION_FEATURE);
				if (parentTime && parentDuration) {
					duration = parentTime + parentDuration - startTime;
				}
			}
			//don't want anything with duration 0 (what other feature values would it have?)
			if (duration > 0) {
				var newDymoUri = this.addDymo(parentUri);
				this.setDymoFeature(newDymoUri, TIME_FEATURE, startTime);
				this.setDymoFeature(newDymoUri, DURATION_FEATURE, duration);
				/*if (segments[i].label && !isNaN(segments[i].label)) {
					this.setDymoFeature(newDymoUri, SEGMENT_LABEL_FEATURE, segments[i].label);
				}*/
				this.updateParentDuration(parentUri, newDymoUri);
			}
		}
	}

	private initTopDymoIfNecessary() {
		if (this.dymoCount == 0) {
			this.currentTopDymo = this.addDymo(null, this.currentSourcePath);
		} else if (this.audioFileChanged) {
			this.currentTopDymo = this.addDymo(this.topDymo, this.currentSourcePath);
			this.audioFileChanged = false;
		}
	}

	private getSuitableParent(time, maxLevel, dymoUri) {
		if (!dymoUri) dymoUri = this.currentTopDymo;
		var nextCandidate = dymoUri;
		var currentLevel = this.store.findLevel(dymoUri);
		while (currentLevel < maxLevel) {
			var parts = this.store.findParts(nextCandidate);
			if (parts.length > 0) {
				parts = parts.map(function(p){return [this.store.findFeatureValue(p, TIME_FEATURE), p]});
				parts.sort(function(p,q){return p[0]-q[0];});
				for (var i = 0; i < parts.length; i++) {
					if (parts[i][0] <= time) {
						nextCandidate = parts[i][1];
					} else if (i == 0) {
						nextCandidate = parts[i][1];
					} else {
						break;
					}
				}
				currentLevel++;
			} else {
				return nextCandidate;
			}
		}
		return nextCandidate;
	}

	private updateParentDuration(parentUri, newDymoUri) {
		var parentTime = this.store.findFeatureValue(parentUri, TIME_FEATURE);
		var newDymoTime = this.store.findFeatureValue(newDymoUri, TIME_FEATURE);
		if (isNaN(parentTime) || Array.isArray(parentTime) || newDymoTime < parentTime) {
			this.setDymoFeature(parentUri, TIME_FEATURE, newDymoTime);
			parentTime = newDymoTime;
		}
		var parentDuration = this.store.findFeatureValue(parentUri, DURATION_FEATURE);
		var newDymoDuration = this.store.findFeatureValue(newDymoUri, DURATION_FEATURE);
		if (isNaN(parentDuration) || Array.isArray(parentDuration) || parentTime+parentDuration < newDymoTime+newDymoDuration) {
			this.setDymoFeature(parentUri, DURATION_FEATURE, newDymoTime+newDymoDuration - parentTime);
		}
	}

	setDymoFeature(dymoUri, featureUri, value) {
		this.store.setFeature(dymoUri, featureUri, value);
		this.updateMinMax(featureUri, value);
	}

	private updateMinMax(featureUri, value) {
		if (!isNaN(value)) {
			this.helpUpdateMinMax(this.getFeature(null, featureUri), value);
		} else if (value instanceof Array) {
			//it's an array
			for (var i = 0; i < value.length; i++) {
				this.helpUpdateMinMax(this.getFeature(null, featureUri), value[i]);
			}
		}
	}

	private helpUpdateMinMax(feature, value) {
		if (feature.max == undefined) {
			feature.min = value;
			feature.max = value;
		} else {
			feature.min = Math.min(value, feature.min);
			feature.max = Math.max(value, feature.max);
		}
	}

	private getFeature(name, uri?: string) {
		//if already exists return that
		for (var i = 0; i < this.features.length; i++) {
			if (this.features[i].name == name) {
				return this.features[i];
			}
			if (this.features[i].uri == uri) {
				return this.features[i];
			}
		}
		return this.internalAddFeature(name, uri);
	}

	private internalAddFeature(name, uri, min?: number, max?: number) {
		//complete name and uri if necessary
		if (!name && uri) {
			name = URI_TO_TERM[uri];
		}
		if (name && !uri) {
			uri = CONTEXT_URI+name;
		}
		//create feature object
		var feature;
		if (min != undefined && max != undefined) {
			feature = {name:name, uri:uri, min:min, max:max};
		} else {
			feature = {name:name, uri:uri, min:1000, max:0};
		}
		//put in features list
		if (this.features.length < 2) {
			this.features.push(feature);
		} else {
			this.features.splice(this.features.length-2, 0, feature);
		}
		if (!this.store.findObject(uri, TYPE)) {
			this.store.addTriple(uri, TYPE, FEATURE_TYPE);
		}
		this.onFeatureAdded(feature);
		return feature;
	}

}
