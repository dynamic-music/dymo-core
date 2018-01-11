import * as _ from 'lodash';
import { GlobalVars } from '../globals/globals';
import { DymoStore } from '../io/dymostore';
import * as uris from '../globals/uris';
import { DymoNavigator } from '../navigators/navigator';
import { SequentialNavigator } from '../navigators/sequential';
import { Scheduler } from './scheduler';
import { Schedulo, Time, Playback } from 'schedulo';
import { ScheduloObjectWrapper } from './wrapper';
import { flattenArray } from 'arrayutils';

interface PlayParams {
	uri: string,
	sourcePath: string,
	start: number,
	duration: number
}

/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
export class SchedulerThread {

	private dymoUri;
	private navigator: DymoNavigator;
	private store: DymoStore;

	private scheduledObjects: ScheduloObjectWrapper[] = [];
	private playingObjects: ScheduloObjectWrapper[] = [];

	constructor(dymoUri: string, private scheduler: Scheduler, navigator?: DymoNavigator) {
		this.dymoUri = dymoUri;
		this.store = scheduler.getStore();
		this.navigator = navigator ? navigator : new DymoNavigator(dymoUri, this.store, new SequentialNavigator(dymoUri, this.store));
		//starts automatically
		this.recursivePlay();
	}

	hasDymo(uri) {
		if (uri === this.dymoUri) {
			return true;
		}
		var dymos = this.store.findAllObjectsInHierarchy(this.dymoUri);
		if (dymos.indexOf(uri)) {
			return true;
		}
	}

	getNavigator() {
		return this.navigator;
	}

	stop(dymoUri) {
		var subDymoUris = this.store.findAllObjectsInHierarchy(dymoUri);
		subDymoUris.forEach(uri => {
			this.scheduledObjects
				.filter(o => o.getUri() === uri)
				.forEach(o => o.stop());
		})
	}

	getPlayingDymoUris(): string[] {
		return flattenArray(this.playingObjects.map(o => o.getUris()));
	}

	private recursivePlay() {
		console.log("RECPLAY")
		let previousObject = _.last(this.scheduledObjects);
		let referenceTime = previousObject ? previousObject.getReferenceTime()
			: this.scheduler.getSchedulo().getCurrentTime()+0.5;
		let currentObjects = this.getNextPlayParams();
		currentObjects.forEach(o => {
			let onset = this.store.findParameterValue(o.uri, uris.ONSET);
			let startTime;
			if (!isNaN(onset)) {
				startTime = Time.At(referenceTime+onset);
			} else if (previousObject) {
				startTime = Time.After([previousObject.getScheduloObject()]);
			} else {
				startTime = Time.At(referenceTime);
			}
			console.log(startTime, this.scheduler.getSchedulo().getCurrentTime())
			let loop = this.store.findParameterValue(o.uri, uris.LOOP);
			//console.log("LOOP", loop)
			let playbackMode = loop ? Playback.Loop(0, o.start, o.duration) : Playback.Oneshot(o.start, o.duration);
			this.scheduler.getSchedulo().scheduleAudio(
				[o.sourcePath],
				startTime,
				playbackMode,
				{
					bufferScheme: 'dynamic',
					timings: {
						connectToGraph: {countIn: 2, countOut: 2},
						loadBuffer: {countIn: 5, countOut: 5}
				}
			}).then(audioObject => {
				console.log("GOT AUDIOOBJ")
				let newObject = new ScheduloObjectWrapper(o.uri, referenceTime, audioObject[0], this.store, this);
				this.scheduledObjects.push(newObject);
				newObject.getScheduloObject().on('scheduled', ()=>{
					console.log("SCHEDULED")
					//this.recursivePlay();
				});
				this.recursivePlay();
			});
		});
	}

	objectStarted(object: ScheduloObjectWrapper) {
		this.playingObjects.push(object);
		this.scheduler.objectStarted(object.getUris());
	}

	objectEnded(object: ScheduloObjectWrapper) {
		this.removeFrom(object, this.scheduledObjects);
		if (this.removeFrom(object, this.playingObjects)) {
			this.scheduler.objectStopped();
		}
		this.endThreadIfNoMoreObjects();
	}

	private removeFrom<T>(element: T, list: T[]): boolean {
		let index = list.indexOf(element);
		if (index >= 0) {
			list.splice(index, 1);
			return true;
		}
		return false;
	}

	private endThreadIfNoMoreObjects() {
		if (this.scheduledObjects.length == 0) {
			this.navigator.reset();
			this.scheduler.threadEnded(this);
		}
	}

	/*private getNextEventTime(startTime: number): [number, PlayParams] {
		if (this.nextObjects) {
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var previousSourceDymoUri = this.currentObjects.keys().next().value;
			var previousOnset = this.store.findParameterValue(previousSourceDymoUri, uris.ONSET);
			var nextSourceDymoUri = this.nextObjects.keys().next().value;
			var nextOnset = this.store.findParameterValue(nextSourceDymoUri, uris.ONSET);
			if (!isNaN(nextOnset)) {
				var timeToNextOnset = Math.max(0, nextOnset-previousOnset);
				return [startTime+timeToNextOnset, null];
			}
		}
		var maxDuration = 0;
		var longestSource;
		for (var source of this.currentObjects.values()) {
			var currentDuration = this.getSourceDuration(source);
			if (currentDuration > maxDuration) {
				maxDuration = currentDuration;
				longestSource = source;
			}
		}
		//console.log(startTime, maxDuration)
		return [startTime+maxDuration, longestSource];
	}*/

	private getSourceDuration(params: PlayParams) {
		let duration = params.duration;
		let playbackRate = this.store.findParameterValue(params.uri, uris.PLAYBACK_RATE);
		duration /= playbackRate ? playbackRate : 1;
		let stretchRatio = this.store.findParameterValue(params.uri, uris.TIME_STRETCH_RATIO);
		duration /= stretchRatio ? stretchRatio : 1;
		return duration;
	}

	private getNextPlayParams(): Map<string,PlayParams> {
		var nextParts = this.navigator.getNextParts();
		var nextObjects = new Map<string,PlayParams>();
		if (nextParts) {
			if (GlobalVars.LOGGING_ON) {
				this.logNextIndices(nextParts);
			}
			nextParts.forEach(p => {
				let sourcePath = this.store.getSourcePath(p);
				let segment = this.calculateSegment(p);
				if (sourcePath) {
					nextObjects.set(p, {
						uri: p,
						sourcePath: sourcePath,
						start: segment[0],
						duration: segment[1]
					});
				}
			})
		}
		return nextObjects;
	}

	private calculateSegment(dymoUri: string): [number, number] {
		let start = this.store.findFeatureValue(this.dymoUri, uris.TIME_FEATURE);
		start = start ? start : 0;
		let durationF = this.store.findFeatureValue(this.dymoUri, uris.DURATION_FEATURE);
		let durationP = this.store.findParameterValue(this.dymoUri, uris.DURATION);
		let duration = durationP ? durationP : durationF;
		//TODO ONLY WORKS IF DURATION PARAM OR FEATURE GIVEN (DELEGATE TO SCHEDULO!!!!!)
		let durationRatio = this.store.findParameterValue(this.dymoUri, uris.DURATION_RATIO);
		if (durationRatio && duration) {
			duration *= durationRatio;
		}
		return [start, duration];
	}

	private logNextIndices(nextParts) {
		console.log(nextParts.map(s => {
			var index = this.store.findFeatureValue(s, uris.INDEX_FEATURE);
			if (!isNaN(index)) {
				return index;
			} else {
				return "top";
			}
		}));
	}

}
