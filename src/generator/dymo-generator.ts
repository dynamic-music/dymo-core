import * as _ from 'lodash';
import { uris, URI_TO_TERM } from '../index';
import { DymoStore } from '../io/dymostore';
import { SUMMARY } from './globals';
import { Segment } from './feature-loader';
//import { Feature } from './types';

interface TimeDymo {
	uri: string,
	time: number,
	duration: number,
	parts: TimeDymo[]
}

/**
 * Offers basic functions for generating dymos, inserts them into the given store.
 */
export class DymoGenerator {

	private ready: Promise<any>;
	private currentTopDymo; //the top dymo for the current audio file
	private currentRenderingUri;
	private summarizingMode = SUMMARY.MEAN;
	private currentSourcePath;
	private dymoCount = 0;
	private renderingCount = 0;

	constructor(private store: DymoStore) {}

	getStore(): DymoStore {
		return this.store;
	}

	getTopDymoJsonld(): Promise<string> {
		return this.store.uriToJsonld(this.currentTopDymo);
	}

	getRenderingJsonld(): Promise<string> {
		return this.store.uriToJsonld(this.currentRenderingUri);
	}

	isReady(): Promise<any> {
		return this.ready;
	}

	resetDymo() {
		this.currentTopDymo = undefined; //the top dymo for the current audio file
		//this.internalAddFeature("level", uris.LEVEL_FEATURE, 0, 0);
		//this.internalAddFeature("random", null, 0, 1);
	}

	addRendering(renderingUri = this.getUniqueRenderingUri(), dymoUri = this.currentTopDymo): string {
		this.currentRenderingUri = renderingUri;
		this.store.addRendering(renderingUri, dymoUri);
		return renderingUri;
	}

	addCustomParameter(typeUri: string, ownerUri?: string, value?: number): string {
		let uri = this.store.addCustomParameter(ownerUri, typeUri);
		if (!isNaN(value)) {
			this.store.setValue(uri, uris.VALUE, value);
		}
		return uri;
	}

	addControl(name: string, type: string, uri?: string, initialValue?: number): string {
		uri = this.store.addControl(name, type, uri);
		if (!isNaN(initialValue)) {
			this.store.setValue(uri, uris.VALUE, initialValue);
		}
		return uri;
	}

	addDataControl(url: string, jsonMap: string, uri?: string): string {
		uri = this.addControl("", uris.DATA_CONTROL, uri);
		this.store.setValue(uri, uris.HAS_URL, url);
	  this.store.setValue(uri, uris.HAS_JSON_MAP, jsonMap);
		return uri;
	}

	addNavigator(navigatorType, variableUri: string) {
		this.store.addNavigator(this.currentRenderingUri, navigatorType, variableUri);
	}

	getCurrentTopDymo() {
		return this.currentTopDymo;
	}

	setSummarizingMode(mode) {
		this.summarizingMode = mode;
	}

	setCurrentSourcePath(path) {
		this.currentSourcePath = path;
	}

	addDymo(parentUri?: string, sourcePath?: string, dymoType?: string, dymoUri?: string) {
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
		var dymoUri = uris.CONTEXT_URI + "dymo" + this.dymoCount;
		this.dymoCount++;
		return dymoUri;
	}

	private getUniqueRenderingUri() {
		var renderingUri = uris.CONTEXT_URI + "rendering" + this.renderingCount;
		this.renderingCount++;
		return renderingUri;
	}

	addFeature(name, data, dymoUri) {
		if (!dymoUri) {
			dymoUri = this.currentTopDymo;
		}
		//Benchmarker.startTask("addFeature")
		this.initTopDymoIfNecessary();
		//var feature = this.getFeature(name);
		//iterate through all levels and add averages
		var dymos = this.store.findAllObjectsInHierarchy(dymoUri);
		for (var i = 0; i < dymos.length; i++) {
			var currentTime = this.store.findFeatureValue(dymos[i], uris.TIME_FEATURE);
			var currentDuration = this.store.findFeatureValue(dymos[i], uris.DURATION_FEATURE);
			var currentValues = data;
			if (!isNaN(currentTime)) {
				//only filter data id time given
				currentValues = currentValues.filter(
					x => currentTime <= x.time && (isNaN(currentDuration) || x.time < currentTime+currentDuration)
				);
			}
			//event-based feature:
			if (currentValues.length < 1) {
				var earlierValues = data.filter(x => x.time.value <= currentTime);
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
			this.setDymoFeature(dymos[i], uris.CONTEXT_URI+name, value);
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
					vector[k] = vectors.reduce((sum, i) => sum + i.value[k], 0) / vectors.length;
				} else if (this.summarizingMode == SUMMARY.MEDIAN) {
					vectors.sort((a, b) => a.value[k] - b.value[k]);
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

	addSegmentation(segments: Segment[], dymoUri: string): void {
		this.initTopDymoIfNecessary();
		var maxLevel = this.store.findMaxLevel(this.currentTopDymo);
		if (!dymoUri) dymoUri = this.currentTopDymo;
		var parentMap = this.recursiveCreateParentMap(dymoUri);
		//console.log(JSON.stringify(parentMap))
		for (var i = 0; i < segments.length; i++) {
			var parent = this.getSuitableParent2(segments[i].time.value, parentMap);
			var startTime = segments[i].time.value;
			var duration;
			if (segments[i].duration) {
				duration = segments[i].duration.value;
			} else if (segments[i+1]) {
				duration = segments[i+1].time.value - startTime;
			} else {
				var parentTime = parent.time;
				var parentDuration = parent.duration;
				if (parentTime && parentDuration) {
					duration = parentTime + parentDuration - startTime;
				}
			}
			//don't want anything with duration 0 (what other feature values would it have?)
			if (duration > 0) {
				var newDymoUri = this.addDymo(parent.uri);
				this.setDymoFeature(newDymoUri, uris.TIME_FEATURE, startTime);
				this.setDymoFeature(newDymoUri, uris.DURATION_FEATURE, duration);
				/*if (segments[i].label && !isNaN(segments[i].label)) {
					this.setDymoFeature(newDymoUri, SEGMENT_LABEL_FEATURE, segments[i].label);
				}*/
				this.updateParentDuration(parent.uri, newDymoUri);
			}
		}
	}

	private recursiveCreateParentMap(topDymoUri: string): TimeDymo {
		const parts = this.store.findParts(topDymoUri);
		/*TODO SORT?? let times = parts.map(p => this.store.findFeatureValue(p, uris.TIME_FEATURE));
		let sortedTimesAndParts = _.zip(times, parts).sort((p,q) => p[0]-q[0]);
		[times, parts] = _.unzip(sortedTimesAndParts);*/
		return {
			uri: topDymoUri,
			time: this.store.findFeatureValue(topDymoUri, uris.TIME_FEATURE),
			duration: this.store.findFeatureValue(topDymoUri, uris.DURATION_FEATURE),
			parts: parts.length > 0 ? parts.map(p => this.recursiveCreateParentMap(p)) : []
		}
	}

	private initTopDymoIfNecessary() {
		if (this.dymoCount == 0) {
			this.currentTopDymo = this.addDymo(null, this.currentSourcePath);
		}
	}

	private getSuitableParent2(time: number, parentMap: TimeDymo): TimeDymo {
		let suitableParent = parentMap;
		while (suitableParent.parts.length > 0) {
			suitableParent.parts.every((p,i) => {
				let eligible = p.time <= time || i == 0
				if (eligible) {
					suitableParent = p;
				}
				return eligible;
			});
		}
		return suitableParent;
	}

	private getSuitableParent(time: number, maxLevel: number, dymoUri: string): string {
		var nextCandidate = dymoUri;
		var currentLevel = this.store.findFeatureValue(dymoUri, uris.LEVEL_FEATURE);
		while (currentLevel < maxLevel) {
			var parts = this.store.findParts(nextCandidate);
			if (parts.length > 0) {
				let times = parts.map(p => this.store.findFeatureValue(p, uris.TIME_FEATURE));
				let sortedTimesAndParts = _.zip(times, parts).sort((p,q) => p[0]-q[0]);
				[times, parts] = _.unzip(sortedTimesAndParts);
				for (var i = 0; i < times.length; i++) {
					if (times[i] <= time) {
						nextCandidate = parts[i];
					} else if (i == 0) {
						nextCandidate = parts[i];
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
		var parentTime = this.store.findFeatureValue(parentUri, uris.TIME_FEATURE);
		var newDymoTime = this.store.findFeatureValue(newDymoUri, uris.TIME_FEATURE);
		if (isNaN(parentTime) || Array.isArray(parentTime) || newDymoTime < parentTime) {
			this.setDymoFeature(parentUri, uris.TIME_FEATURE, newDymoTime);
			parentTime = newDymoTime;
		}
		var parentDuration = this.store.findFeatureValue(parentUri, uris.DURATION_FEATURE);
		var newDymoDuration = this.store.findFeatureValue(newDymoUri, uris.DURATION_FEATURE);
		if (isNaN(parentDuration) || Array.isArray(parentDuration) || parentTime+parentDuration < newDymoTime+newDymoDuration) {
			this.setDymoFeature(parentUri, uris.DURATION_FEATURE, newDymoTime+newDymoDuration - parentTime);
		}
	}

	setDymoFeature(dymoUri, featureUri, value) {
		if (!this.store.findObject(featureUri, uris.TYPE)) {
			this.store.addTriple(featureUri, uris.TYPE, uris.FEATURE_TYPE);
		}
		this.store.setFeature(dymoUri, featureUri, value);
		//this.updateMinMax(featureUri, value);
	}

	setDymoParameter(dymoUri, parameterUri, value) {
		this.store.setParameter(dymoUri, parameterUri, value);
		//this.updateMinMax(featureUri, value);
	}

	/*private updateMinMax(featureUri, value) {
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

	private getFeature(name, uri?: string): Feature {
		let match = this.features.getValue().filter(f => f.name == name || f.uri == uri);
		return match.length > 0 ? match[0] : this.internalAddFeature(name, uri);
	}

	private internalAddFeature(name, uri, min?: number, max?: number): Feature {
		//complete attributes if necessary
		name = !name && uri ? URI_TO_TERM[uri] : name;
		uri = name && !uri ? uris.CONTEXT_URI+name : uri;
		min = min != null ? min : 1000;
		max = max != null ? max : 0;
		//create feature object and push
		let feature = {name:name, uri:uri, min:min, max:max};
		let features = _.clone(this.features.getValue());
		features.length < 2 ? features.push(feature) : features.splice(features.length-2, 0, feature);
		if (!this.store.findObject(uri, uris.TYPE)) {
			this.store.addTriple(uri, uris.TYPE, uris.FEATURE_TYPE);
		}
		this.features.next(features);
		return feature;
	}*/

}
