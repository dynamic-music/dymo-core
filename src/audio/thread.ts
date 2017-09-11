import { GlobalVars } from '../globals/globals'
import { DymoStore } from '../io/dymostore'
import * as uris from '../globals/uris'
import { AudioBank } from './audio-bank';
import { DymoNode } from './node'
import { DymoSource } from './source'
import { DymoNavigator } from '../navigators/navigator'
import { SequentialNavigator } from '../navigators/sequential'

/**
 * Plays back a dymo using a navigator.
 * @constructor
 */
export class SchedulerThread {

	private dymoUri;
	private navigator: DymoNavigator;
	private audioContext;
	private audioBank: AudioBank;
	private convolverSend;
	private delaySend;
	private onChanged;
	private onEnded;

	private sources = new Map(); //dymo->list<source>
	private nodes = new Map(); //dymo->list<nodes>
	private nextSources;
	private timeoutID;
	private currentSources = new Map();
	private nextEventTime;

	constructor(dymoUri, navigator, audioContext, audioBank: AudioBank, convolverSend, delaySend, onChanged, onEnded, private store: DymoStore) {
		this.dymoUri = dymoUri;
		this.navigator = navigator ? navigator : new DymoNavigator(dymoUri, this.store, new SequentialNavigator(dymoUri, this.store));
		this.audioContext = audioContext;
		this.audioBank = audioBank;
		this.convolverSend = convolverSend;
		this.delaySend = delaySend;
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

	/*this.pause(dymo) {
		var dymos = dymo.getAllDymosInHierarchy();
		for (var i = 0, ii = dymos.length; i < ii; i++) {
			var currentSources = sources.get(dymos[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].pause();
				}
			}
		}
	}*/

	stop(dymoUri) {
		if (dymoUri === this.dymoUri) {
			clearTimeout(this.timeoutID);
		}
		var subDymoUris = this.store.findAllObjectsInHierarchy(dymoUri);
		for (var i = 0, ii = subDymoUris.length; i < ii; i++) {
			if (this.nextSources) {
				var currentNextSource = this.nextSources.get(subDymoUris[i])
				if (currentNextSource) {
					currentNextSource.removeAndDisconnect();
					this.nextSources.delete(subDymoUris[i]);
				}
				if (this.nextSources.size <= 0) {
					this.nextSources = undefined;
				}
			}
			var currentSources = this.sources.get(subDymoUris[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].stop();
				}
			}
		}
	}

	getAllSources() {
		return this.sources;
	}

	/** returns the sources correponding to the given dymo */
	getSources(dymo) {
		return this.sources.get(dymo);
	}

	private recursivePlay() {
		var previousSources = this.currentSources;
		//create sources and init
		this.currentSources = this.getNextSources();
		this.registerSources(this.currentSources);
		//calculate delay and schedule
		var delay = this.nextEventTime ? this.nextEventTime-this.audioContext.currentTime : GlobalVars.SCHEDULE_AHEAD_TIME;
		var startTime = this.audioContext.currentTime+delay;
		//console.log("START", startTime)
		for (var source of this.currentSources.values()) {
			//console.log(this.audioContext.currentTime, currentEndTime, startTime)
			source.play(startTime);
		}
		//stop automatically looping sources
		for (var source of previousSources.values()) {
			if (this.store.findParameterValue(source.getDymoUri(), uris.LOOP)) {
				source.stop(startTime);
			}
		}
		setTimeout(() => this.onChanged(this), delay+50);
		//create next sources and wait or end and reset
		this.nextSources = this.createNextSources();
		if (this.nextSources && this.nextSources.size > 0) {
			this.nextEventTime = this.getNextEventTime(startTime);
			var longestSource = this.nextEventTime[1];
			this.nextEventTime = this.nextEventTime[0];
			//smooth transition in case of a loop
			if (longestSource && this.store.findParameterValue(longestSource.getDymoUri(), uris.LOOP)) {
				this.nextEventTime -= GlobalVars.FADE_LENGTH;
			}
			var wakeupTime = (this.nextEventTime-this.audioContext.currentTime-GlobalVars.SCHEDULE_AHEAD_TIME)*1000;
			this.timeoutID = setTimeout(() => this.recursivePlay(), wakeupTime);
		} else {
			this.nextEventTime = this.getNextEventTime(startTime);
			var wakeupTime = (this.nextEventTime-this.audioContext.currentTime)*1000;
			setTimeout(() => {
				this.endThreadIfNoMoreSources();
			}, wakeupTime+100);
		}
	}

	private getNextSources() {
		if (!this.nextSources) {
			//create first sources
			return this.createNextSources();
		} else {
			//switch to next sources
			return this.nextSources;
		}
	}

	private registerSources(newSources) {
		for (var dymoKey of newSources.keys()) {
			if (!this.sources.get(dymoKey)) {
				this.sources.set(dymoKey, []);
			}
			this.sources.get(dymoKey).push(newSources.get(dymoKey));
		}
	}

	private sourceEnded(source) {
		var sourceList = this.sources.get(source.getDymoUri());
		if (sourceList) {
			sourceList.splice(sourceList.indexOf(source), 1);
			if (sourceList.length <= 0) {
				source.removeAndDisconnect();
				this.sources.delete(source.getDymoUri());
			}
			setTimeout(() => this.onChanged(this), 50);
		}
		this.endThreadIfNoMoreSources();
	}

	private endThreadIfNoMoreSources() {
		if (this.sources.size == 0 && (!this.nextSources || this.nextSources.size == 0)) {
			clearTimeout(this.timeoutID);
			this.navigator.reset();
			//remove all nodes (TODO works well but COULD BE DONE SOMEWHERE ELSE FOR EVERY NODE THAT HAS NO LONGER ANYTHING ATTACHED TO INPUT..)
			var subDymoUris = this.store.findAllObjectsInHierarchy(this.dymoUri);
			subDymoUris.forEach(uri => {
				this.nodes.get(uri) ? this.nodes.get(uri).removeAndDisconnect() : null;
			});
			if (this.onEnded) {
				this.onEnded();
			}
		}
	}

	private getNextEventTime(startTime) {
		if (this.nextSources) {
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var previousSourceDymoUri = this.currentSources.keys().next().value;
			var previousOnset = this.store.findParameterValue(previousSourceDymoUri, uris.ONSET);
			var nextSourceDymoUri = this.nextSources.keys().next().value;
			var nextOnset = this.store.findParameterValue(nextSourceDymoUri, uris.ONSET);
			if (!isNaN(nextOnset)) {
				var timeToNextOnset = Math.max(0, nextOnset-previousOnset);
				return [startTime+timeToNextOnset];
			}
		}
		var maxDuration = 0;
		var longestSource;
		for (var source of this.currentSources.values()) {
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
		return source.getDuration()/source.getParameterValue(uris.PLAYBACK_RATE);
	}

	private createNextSources() {
		var nextParts = this.navigator.getNextParts();
		if (nextParts) {
			if (GlobalVars.LOGGING_ON) {
				this.logNextIndices(nextParts);
			}
			var nextSources = new Map();
			for (var i = 0; i < nextParts.length; i++) {
				var sourcePath = this.store.getSourcePath(nextParts[i]);
				if (sourcePath) {
					var buffer = this.audioBank.getLoadedBuffer(sourcePath)
					var newSource = new DymoSource(nextParts[i], this.audioContext, buffer, this.convolverSend, this.delaySend, this.sourceEnded.bind(this), this.store);
					this.createAndConnectToNodes(newSource);
					nextSources.set(nextParts[i], newSource);
				} else {
					nextSources.set(nextParts[i], new DymoSource(nextParts[i], this.audioContext, null, null, null, this.sourceEnded.bind(this), this.store));
				}
			}
			return nextSources;
		}
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

	private createAndConnectToNodes(source) {
		var currentNode = source;
		var currentParentDymo = this.store.findParents(source.getDymoUri())[0];
		while (currentParentDymo) {
			//parent node already defined, so just connect and exit
			if (this.nodes.has(currentParentDymo)) {
				currentNode.connect(this.nodes.get(currentParentDymo).getInput());
				return;
			}
			//parent node doesn't exist, so create entire missing parent hierarchy
			var parentNode = new DymoNode(currentParentDymo, this.audioContext, this.convolverSend, this.delaySend, this.store);
			currentNode.connect(parentNode.getInput());
			this.nodes.set(currentParentDymo, parentNode);
			currentParentDymo = this.store.findParents(currentParentDymo)[0];
			currentNode = parentNode;
		}
		//no more parent, top dymo reached, connect to main output
		currentNode.connect(this.audioContext.destination);
	}

}
