import { GlobalVars } from '../globals/globals'
import { ONSET, LOOP } from '../globals/uris'
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
	private buffers;
	private convolverSend;
	private delaySend;
	private onChanged;
	private onEnded;

	private sources = new Map(); //dymo->list<source>
	private nodes = new Map(); //dymo->list<nodes>
	private nextSources;
	private timeoutID;
	private currentSources = new Map();
	private currentEndTime;
	private previousOnset;

	constructor(dymoUri, navigator, audioContext, buffers, convolverSend, delaySend, onChanged, onEnded) {
		this.dymoUri = dymoUri;
		this.navigator = navigator;
		this.audioContext = audioContext;
		this.buffers = buffers;
		this.convolverSend = convolverSend;
		this.delaySend = delaySend;
		this.onChanged = onChanged;
		this.onEnded = onEnded;
		if (!this.navigator) {
			this.navigator = new DymoNavigator(dymoUri, new SequentialNavigator(dymoUri));
		}
		//starts automatically
		this.recursivePlay();
	}

	hasDymo(uri) {
		var dymos = GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(this.dymoUri);
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
		var subDymoUris = GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(this.dymoUri);
		for (var i = 0, ii = subDymoUris.length; i < ii; i++) {
			var currentSources = this.sources.get(subDymoUris[i]);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					currentSources[j].stop();
				}
			}
			if (this.nextSources) {
				this.nextSources.delete(subDymoUris[i]);
				if (this.nextSources.size <= 0) {
					this.nextSources = undefined;
				}
			}
		}
	}

	getAllSources() {
		return this.sources;
	}

	/** returns the sources correponding to the given dymo */
	private getSources(dymo) {
		return this.sources.get(dymo);
	}

	private recursivePlay() {
		//console.log("PLAY", this.audioContext.currentTime)
		var previousSources = this.currentSources;
		//create sources and init
		this.currentSources = this.getNextSources();
		this.registerSources(this.currentSources);
		if (!this.previousOnset) {
			var previousSourceDymoUri = this.currentSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			this.previousOnset = GlobalVars.DYMO_STORE.findParameterValue(previousSourceDymoUri, ONSET);
		}
		//calculate delay and schedule
		var delay = this.currentEndTime ? this.currentEndTime-this.audioContext.currentTime : GlobalVars.SCHEDULE_AHEAD_TIME;
		var startTime = this.audioContext.currentTime+delay;
		//console.log("START", startTime)
		for (var source of this.currentSources.values()) {
			//console.log(this.audioContext.currentTime, currentEndTime, startTime)
			source.play(startTime);
		}
		//stop automatically looping sources
		for (var source of previousSources.values()) {
			if (GlobalVars.DYMO_STORE.findParameterValue(source.getDymoUri(), LOOP)) {
				source.stop(startTime);
			}
		}
		setTimeout(() => this.onChanged(this), delay+50);
		//create next sources and wait or end and reset
		this.nextSources = this.createNextSources();
		if (this.nextSources && this.nextSources.size > 0) {
			this.currentEndTime = this.getCurrentEndTime(startTime);
			var longestSource = this.currentEndTime[1];
			this.currentEndTime = this.currentEndTime[0];
			//smooth transition in case of a loop
			if (GlobalVars.DYMO_STORE.findParameterValue(longestSource.getDymoUri(), LOOP)) {
				this.currentEndTime -= GlobalVars.FADE_LENGTH;
			}
			var wakeupTime = (this.currentEndTime-this.audioContext.currentTime-GlobalVars.SCHEDULE_AHEAD_TIME)*1000;
			this.timeoutID = setTimeout(() => this.recursivePlay(), wakeupTime);
		} else {
			this.currentEndTime = this.getCurrentEndTime(startTime);
			var wakeupTime = (this.currentEndTime-this.audioContext.currentTime)*1000;
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
		sourceList.splice(sourceList.indexOf(source), 1);
		if (sourceList.length <= 0) {
			this.sources.delete(source.getDymoUri());
		}
		setTimeout(() => this.onChanged(this), 50);
		this.endThreadIfNoMoreSources();
	}

	private endThreadIfNoMoreSources() {
		if (this.sources.size == 0 && (!this.nextSources || this.nextSources.size == 0)) {
			window.clearTimeout(this.timeoutID);
			this.navigator.reset();
			//remove all nodes (TODO works well but COULD BE DONE SOMEWHERE ELSE FOR EVERY NODE THAT HAS NO LONGER ANYTHING ATTACHED TO INPUT..)
			var subDymoUris = GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(this.dymoUri);
			for (var i = 0, ii = subDymoUris.length; i < ii; i++) {
				var currentNode = this.nodes.get(subDymoUris[i]);
				if (currentNode) {
					currentNode.removeAndDisconnect();
				}
			}
			if (this.onEnded) {
				this.onEnded();
			}
		}
	}

	private getCurrentEndTime(startTime) {
		if (this.nextSources) {
			var nextSourceDymoUri = this.nextSources.keys().next().value;
			//TODO CURRENTLY ASSUMING ALL PARALLEL SOURCES HAVE SAME ONSET AND DURATION
			var nextOnset = GlobalVars.DYMO_STORE.findParameterValue(nextSourceDymoUri, ONSET);
			var timeToNextOnset = nextOnset-this.previousOnset;
			this.previousOnset = nextOnset;
			if (!isNaN(nextOnset)) {
				return startTime+timeToNextOnset;
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
		return [startTime+maxDuration, longestSource];
	}

	private getSourceDuration(source) {
		//var playbackRate = source.getDymo().getParameter(PLAYBACK_RATE).getValue();
		return source.getDuration();// /playbackRate;
	}

	private createNextSources() {
		var nextParts = this.navigator.getNextParts();
		if (nextParts) {
			this.logNextIndices(nextParts);
			var nextSources = new Map();
			for (var i = 0; i < nextParts.length; i++) {
				var sourcePath = GlobalVars.DYMO_STORE.getSourcePath(nextParts[i]);
				if (sourcePath) {
					var buffer = this.buffers[sourcePath];
					var newSource = new DymoSource(nextParts[i], this.audioContext, buffer, this.convolverSend, this.delaySend, this.sourceEnded.bind(this));
					this.createAndConnectToNodes(newSource);
					nextSources.set(nextParts[i], newSource);
				}
			}
			return nextSources;
		}
	}

	private logNextIndices(nextParts) {
		console.log(nextParts.map(s => {
			var index = GlobalVars.DYMO_STORE.findPartIndex(s);
			if (!isNaN(index)) {
				return index;
			} else {
				return "top";
			}
		}));
	}

	private createAndConnectToNodes(source) {
		var currentNode = source;
		var currentParentDymo = GlobalVars.DYMO_STORE.findParents(source.getDymoUri())[0];
		while (currentParentDymo) {
			//parent node already defined, so just connect and exit
			if (this.nodes.has(currentParentDymo)) {
				currentNode.connect(this.nodes.get(currentParentDymo).getInput());
				return;
			}
			//parent node doesn't exist, so create entire missing parent hierarchy
			var parentNode = new DymoNode(currentParentDymo, this.audioContext, this.convolverSend, this.delaySend);
			currentNode.connect(parentNode.getInput());
			this.nodes.set(currentParentDymo, parentNode);
			currentParentDymo = GlobalVars.DYMO_STORE.findParents(currentParentDymo)[0];
			currentNode = parentNode;
		}
		//no more parent, top dymo reached, connect to main output
		currentNode.connect(this.audioContext.destination);
	}

}
