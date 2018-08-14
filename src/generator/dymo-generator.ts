import * as _ from 'lodash';
import * as math from 'mathjs';
import * as uuidv4 from 'uuid/v4';
import * as uris from '../globals/uris';
import { SuperDymoStore } from '../globals/types';
import { Constraint } from '../model/constraint';
import { SUMMARY } from './globals';
import { Segment, DataPoint } from './feature-loader';
import { DymoManager } from '../manager';
//import { Feature } from './types';

interface TimeDymo {
	uri: string,
	time: number,
	duration: number,
	parts: TimeDymo[]
}

export interface Value<T> {
  value: T;
}
export interface Feature {
	time: Value<number>;
	value: any;
}

/**
 * Offers basic functions for generating dymos, inserts them into the given store.
 */
export class DymoGenerator {

	private currentTopDymo; //the top dymo for the current audio file
	private currentRenderingUri;
	private summarizingMode = SUMMARY.MEAN;
	private currentSourcePath;
	private dymoCount = 0;
	private renderingCount = 0;

	constructor(private useUuids = true, private store = new DymoManager().getStore()) {
	}

	getStore(): SuperDymoStore {
		return this.store;
	}

	getTopDymoJsonld(): Promise<string> {
		return this.store.uriToJsonld(this.currentTopDymo);
	}

	getRenderingJsonld(): Promise<string> {
		return this.store.uriToJsonld(this.currentRenderingUri);
	}

	resetDymo() {
		this.currentTopDymo = undefined; //the top dymo for the current audio file
		//this.internalAddFeature("level", uris.LEVEL_FEATURE, 0, 0);
		//this.internalAddFeature("random", null, 0, 1);
	}

	addRendering(dymoUri = this.currentTopDymo): string {
		this.currentRenderingUri = this.getUniqueRenderingUri();
		this.store.addRendering(this.currentRenderingUri, dymoUri);
		return this.currentRenderingUri;
	}

	addConstraint(constraint: Constraint): Promise<string> {
		if (!this.currentRenderingUri) {
			this.addRendering();
		}
		return this.store.addConstraint(this.currentRenderingUri, constraint);
	}

	async addCustomParameter(typeUri: string, ownerUri?: string, value?: number): Promise<string> {
		let uri = await this.store.addCustomParameter(ownerUri, typeUri);
		if (!isNaN(value)) {
			this.store.setValue(uri, uris.VALUE, value);
		}
		return uri;
	}

	async addControl(name: string, type: string, uri?: string, initialValue?: number): Promise<string> {
		uri = await this.store.addControl(name, type, uri);
		if (!isNaN(initialValue)) {
			await this.store.setValue(uri, uris.VALUE, initialValue);
		}
		return uri;
	}

	async addRampControl(initialValue: number, duration: number, frequency?: number, name?: string): Promise<string> {
		let uri = await this.addControl(name, uris.RAMP, null, initialValue);
		await this.store.setValue(uri, uris.HAS_DURATION, duration);
		await this.store.setControlParam(uri, uris.AUTO_CONTROL_FREQUENCY, frequency);
		return uri;
	}

	async addDataControl(url: string, jsonMap: string, uri?: string): Promise<string> {
		uri = await this.addControl("", uris.DATA_CONTROL, uri);
		await this.store.setValue(uri, uris.HAS_URL, url);
		await this.store.setValue(uri, uris.HAS_JSON_MAP, jsonMap);
		return uri;
	}

	addNavigator(navigatorType: string, variableUri: string) {
		return this.store.addNavigator(this.currentRenderingUri, navigatorType, variableUri);
	}

	getCurrentTopDymo() {
		return this.currentTopDymo;
	}

	setSummarizingMode(mode: string) {
		this.summarizingMode = mode;
	}

	setCurrentSourcePath(path: string) {
		this.currentSourcePath = path;
	}

	async addDeepCopy(dymoUri: string, parentUri?: string) {
		const source = await this.store.getSourcePath(dymoUri);
		const type = await this.store.findObject(dymoUri, uris.TYPE);
		const copyUri = await this.addDymo(parentUri, source, type);
		const features = await this.store.findAllObjects(dymoUri, uris.HAS_FEATURE);
		await Promise.all(features.map(async f => {
			const type = await this.store.findObject(f, uris.TYPE);
			const value = await this.store.findObjectValue(f, uris.VALUE);
			await this.setDymoFeature(copyUri, type, value);
		}));
		const params = await this.store.findAllObjects(dymoUri, uris.HAS_PARAMETER);
		await Promise.all(params.map(async p => {
			const type = await this.store.findObject(p, uris.TYPE);
			const value = await this.store.findObjectValue(p, uris.VALUE);
			await this.setDymoParameter(copyUri, type, value);
		}));
		const parts = await this.store.findParts(dymoUri);
		await Promise.all(parts.map(async p => {
			await this.addDeepCopy(p, copyUri);
		}));
		return copyUri;
	}

	async addDymo(parentUri?: string, sourcePath?: string, dymoType?: string, dymoUri?: string) {
		if (!dymoUri) {
			dymoUri = this.getUniqueDymoUri();
		}
		dymoUri = await this.store.addDymo(dymoUri, parentUri, null, sourcePath, dymoType);
		if (!parentUri) {
			this.currentTopDymo = dymoUri;
		}
		return dymoUri;
	}

	async addConjunction(parentUri: string, partUris: string[]): Promise<string> {
		var uri = await this.addDymo(parentUri, null, uris.CONJUNCTION);
		await Promise.all(partUris.map(p => this.store.addPart(uri, p)));
		return uri;
	}

	async addEvent(parentUri: string, targetUri: string, value: string | number): Promise<string> {
		const uri = await this.addDymo(parentUri, null, uris.EVENT);
		await this.store.addTriple(uri, uris.HAS_TARGET, targetUri);
		await this.store.setValue(uri, uris.VALUE, value);
		return uri;
	}

	async addFeature(name: string, data: DataPoint[], dymoUri: string) {
		if (!dymoUri) {
			dymoUri = this.currentTopDymo;
		}
		//Benchmarker.startTask("addFeature")
		this.initTopDymoIfNecessary();
		//var feature = this.getFeature(name);
		//iterate through all levels and add averages
		var dymos = await this.store.findAllObjectsInHierarchy(dymoUri);
		for (var i = 0; i < dymos.length; i++) {
			var currentTime = await this.store.findFeatureValue(dymos[i], uris.TIME_FEATURE);
			var currentDuration = await this.store.findFeatureValue(dymos[i], uris.DURATION_FEATURE);
			var currentValues = data;
			if (!isNaN(currentTime) && currentTime != null) {
				//only filter data id time given
				currentValues = currentValues.filter(
					x => currentTime <= x.time && (isNaN(currentDuration) || x.time < currentTime+currentDuration)
				);
			}
			//event-based feature:
			if (currentValues.length < 1) {
				var earlierValues = data.filter(x => x.time.value <= currentTime);
				if (earlierValues.length > 0) {
					currentValues = [_.last(earlierValues)];
				} else {
					//set to first value
					currentValues = [data[0]];
				}
			}

			var value = this.getSummarizedValues(_.cloneDeep(currentValues));
			/*if (typeof value == "string") {
				var labelFeature = getFeature(SEGMENT_LABEL);
				this.setDymoFeature(dymos[i], getFeature(SEGMENT_LABEL), value);
			}*/
			this.setDymoFeature(dymos[i], uris.CONTEXT_URI+name, value);
		}
	}

	//summarizes the given vectors into one based on summarizingMode
	private getSummarizedValues(features: any[]) {
		if (features && features.length > 0) {
			//get values out, convert to arrays
			let vectors = features.map(v => v.value.length ? v.value : [v.value]);
			//summarize dimension by dimension
			let summary = _.zip(...vectors).map(v => {
				if (typeof v[0] == "string" || this.summarizingMode == SUMMARY.FIRST) {
					return v[0];
				} else if (this.summarizingMode == SUMMARY.MEAN) {
					return _.mean(v);
				} else if (this.summarizingMode == SUMMARY.MEDIAN) {
					return math.median(v);
				} else if (this.summarizingMode == SUMMARY.MODE) {
					return math.mode(v);
				}
			});
			summary = summary[0];
			if (summary.length == 1) {
				return summary[0];
			}
			return summary;
		}
		return 0;
	}

	async addSegmentation(segments: Segment[], dymoUri: string): Promise<void> {
		this.initTopDymoIfNecessary();
		//var maxLevel = await this.store.findMaxLevel(this.currentTopDymo);
		if (!dymoUri) dymoUri = this.currentTopDymo;
		var parentMap = await this.recursiveCreateParentMap(dymoUri);
		//console.log(JSON.stringify(parentMap))
		for (var i = 0; i < segments.length; i++) {
			var parent = this.getSuitableParent(segments[i].time.value, parentMap);
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
				var newDymoUri = await this.addDymo(parent.uri);
				this.setDymoFeature(newDymoUri, uris.TIME_FEATURE, startTime);
				this.setDymoFeature(newDymoUri, uris.DURATION_FEATURE, duration);
				/*if (segments[i].label && !isNaN(segments[i].label)) {
					this.setDymoFeature(newDymoUri, SEGMENT_LABEL_FEATURE, segments[i].label);
				}*/
				this.updateParentDuration(parent, { uri: newDymoUri, time: startTime, duration: duration, parts:[] });
			}
		}
	}

	private async recursiveCreateParentMap(topDymoUri: string): Promise<TimeDymo> {
		let parts = await this.store.findParts(topDymoUri);
		/*TODO SORT?? let times = parts.map(p => this.store.findFeatureValue(p, uris.TIME_FEATURE));
		let sortedTimesAndParts = _.zip(times, parts).sort((p,q) => p[0]-q[0]);
		[times, parts] = _.unzip(sortedTimesAndParts);*/
		return {
			uri: topDymoUri,
			time: await this.store.findFeatureValue(topDymoUri, uris.TIME_FEATURE),
			duration: await this.store.findFeatureValue(topDymoUri, uris.DURATION_FEATURE),
			parts: parts.length > 0 ? await Promise.all(parts.map(p => this.recursiveCreateParentMap(p))) : []
		}
	}

	private initTopDymoIfNecessary() {
		if (this.dymoCount == 0) {
			this.currentTopDymo = this.addDymo(null, this.currentSourcePath);
		}
	}

	private getSuitableParent(time: number, parentMap: TimeDymo): TimeDymo {
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

	private updateParentDuration(parent: TimeDymo, newDymo: TimeDymo) {
		if (isNaN(parent.time) || Array.isArray(parent.time) || newDymo.time < parent.time) {
			parent.time = newDymo.time;
			this.setDymoFeature(parent.uri, uris.TIME_FEATURE, parent.time);
		}
		if (isNaN(parent.duration) || Array.isArray(parent.duration) || parent.time+parent.duration < newDymo.time+newDymo.duration) {
			parent.duration = newDymo.time + newDymo.duration - parent.time;
			this.setDymoFeature(parent.uri, uris.DURATION_FEATURE, parent.duration);
		}
	}

	async setDymoFeature(dymoUri: string, featureUri: string, value: string | number | number[]) {
		if (!await this.store.findObject(featureUri, uris.TYPE)) {
			await this.store.addTriple(featureUri, uris.TYPE, uris.FEATURE_TYPE);
		}
		return this.store.setFeature(dymoUri, featureUri, value);
		//this.updateMinMax(featureUri, value);
	}

	setDymoParameter(dymoUri: string, parameterUri: string, value: string | number | number[]) {
		return this.store.setParameter(dymoUri, parameterUri, value);
		//this.updateMinMax(featureUri, value);
	}

	private getUniqueDymoUri() {
		if (this.useUuids) {
			return uris.CONTEXT_URI + uuidv4();
		}
		var dymoUri = uris.CONTEXT_URI + "dymo" + this.dymoCount;
		this.dymoCount++;
		return dymoUri;
	}

	private getUniqueRenderingUri() {
		if (this.useUuids) {
			return uris.CONTEXT_URI + uuidv4();
		}
		var renderingUri = uris.CONTEXT_URI + "rendering" + this.renderingCount;
		this.renderingCount++;
		return renderingUri;
	}

}
