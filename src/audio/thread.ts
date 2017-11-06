import { GlobalVars } from '../globals/globals'
import { DymoStore } from '../io/dymostore'
import * as uris from '../globals/uris'
import { AudioBank } from './audio-bank';
import { DymoNode } from './node'
import { DymoSource } from './source'
import { DymoNavigator } from '../navigators/navigator'
import { SequentialNavigator } from '../navigators/sequential'
import { Schedulo, Time, Playback } from 'schedulo';
import { ScheduloObjectWrapper } from './wrapper';

interface PlayParams {
	uri: string,
	sourcePath: string,
	segment: [number,number]
}

/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
export class SchedulerThread {

	private dymoUri;
	private navigator: DymoNavigator;
	private onChanged;
	private onEnded;

	private playingObjects: ScheduloObjectWrapper[] = [];
	private nextObjects: Map<string, PlayParams>;
	private timeoutID;
	private currentObjects = new Map<string, PlayParams>();
	private nextEventTime;

	constructor(dymoUri: string, private schedulo: Schedulo, onChanged: ()=>any, onEnded: ()=>any, private store: DymoStore, navigator?: DymoNavigator) {
		this.dymoUri = dymoUri;
		this.navigator = navigator ? navigator : new DymoNavigator(dymoUri, this.store, new SequentialNavigator(dymoUri, this.store));
		this.onChanged = onChanged;
		this.onEnded = onEnded;
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
		if (dymoUri === this.dymoUri) {
			clearTimeout(this.timeoutID);
		}
		var subDymoUris = this.store.findAllObjectsInHierarchy(dymoUri);
		subDymoUris.forEach(uri => {
			if (this.nextObjects) {
				if (this.nextObjects.has(uri)) {
					this.nextObjects.delete(uri);
				}
				if (this.nextObjects.size <= 0) {
					this.nextObjects = undefined;
				}
			}
			this.playingObjects.filter(o => o.getUri() === uri).forEach(o => o.stop());
		})
	}

	getAllSources(): string[] {
		return this.playingObjects.map(o => o.getUri());
	}

	private recursivePlay() {
		var previousSources = this.currentObjects;
		//create sources and init
		this.currentObjects = this.nextObjects ? this.nextObjects : this.getNextPlayParams();
		//calculate delay and schedule
		var currentTime = this.schedulo.getCurrentTime();
		var delay = this.nextEventTime ? this.nextEventTime-currentTime : GlobalVars.SCHEDULE_AHEAD_TIME;
		var startTime = currentTime+delay;
		//console.log("START", startTime)
		for (var source of this.currentObjects.values()) {
			//console.log(this.audioContext.currentTime, currentEndTime, startTime)
			this.schedulo.scheduleAudio(
				[source.sourcePath],
				Time.At(startTime),
				Playback.Oneshot(source.segment[0], source.segment[1])
			).then(audioObject =>
				this.playingObjects.push(new ScheduloObjectWrapper(source.uri, audioObject[0], this.store, this.objectEnded.bind(this)))
			);
			//source.play(startTime);
		}
		setTimeout(() => this.onChanged(this), delay+50);
		//create next sources and wait or end and reset
		this.nextObjects = this.getNextPlayParams();
		if (this.nextObjects && this.nextObjects.size > 0) {
			this.nextEventTime = this.getNextEventTime(startTime);
			var longestSource = this.nextEventTime[1];
			this.nextEventTime = this.nextEventTime[0];
			//smooth transition in case of a loop
			if (longestSource && this.store.findParameterValue(longestSource.getDymoUri(), uris.LOOP)) {
				this.nextEventTime -= GlobalVars.FADE_LENGTH;
			}
			var wakeupTime = (this.nextEventTime-currentTime-GlobalVars.SCHEDULE_AHEAD_TIME)*1000;
			this.timeoutID = setTimeout(() => this.recursivePlay(), wakeupTime);
		} else {
			this.nextEventTime = this.getNextEventTime(startTime);
			var wakeupTime = (this.nextEventTime-currentTime)*1000;
			setTimeout(() => {
				this.endThreadIfNoMoreSources();
			}, wakeupTime+100);
		}
	}

	private objectEnded(object: ScheduloObjectWrapper) {
		let index = this.playingObjects.indexOf(object);
		if (index >= 0) {
			this.playingObjects.splice(index, 1);
			setTimeout(() => this.onChanged(this), 50);
		}
		this.endThreadIfNoMoreSources();
	}

	private endThreadIfNoMoreSources() {
		if (this.playingObjects.length == 0 && (!this.nextObjects || this.nextObjects.size == 0)) {
			clearTimeout(this.timeoutID);
			this.navigator.reset();
			//remove all nodes (TODO works well but COULD BE DONE SOMEWHERE ELSE FOR EVERY NODE THAT HAS NO LONGER ANYTHING ATTACHED TO INPUT..)
			var subDymoUris = this.store.findAllObjectsInHierarchy(this.dymoUri);
			if (this.onEnded) {
				this.onEnded();
			}
		}
	}

	private getNextEventTime(startTime) {
		if (this.nextObjects) {
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var previousSourceDymoUri = this.currentObjects.keys().next().value;
			var previousOnset = this.store.findParameterValue(previousSourceDymoUri, uris.ONSET);
			var nextSourceDymoUri = this.nextObjects.keys().next().value;
			var nextOnset = this.store.findParameterValue(nextSourceDymoUri, uris.ONSET);
			if (!isNaN(nextOnset)) {
				var timeToNextOnset = Math.max(0, nextOnset-previousOnset);
				return [startTime+timeToNextOnset];
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
	}

	private getSourceDuration(source) {
		let duration = source.getDuration();
		let playbackRate = source.getParameterValue(uris.PLAYBACK_RATE);
		duration /= playbackRate ? playbackRate : 1;
		let stretchRatio = source.getParameterValue(uris.TIME_STRETCH_RATIO);
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
				if (sourcePath) {
					nextObjects.set(p, {
						uri: p,
						sourcePath: sourcePath,
						segment: this.calculateSegment(p)
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
