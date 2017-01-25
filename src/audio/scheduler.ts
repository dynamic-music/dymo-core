import { GlobalVars } from '../globals/globals'
import { LISTENER_ORIENTATION, REVERB, DELAY, PLAY, VALUE, HAS_PARAMETER } from '../globals/uris'
import { flattenArray, removeDuplicates } from '../util/arrays'
import { SchedulerThread } from './thread'

/**
 * Manages playing back any number of dymos.
 */
export class Scheduler {

	private audioContext;
	private onPlaybackChange;
	private buffers = {};
	private threads = [];
	private urisOfPlayingDymos = [];

	private convolverSend;
	private delaySend;
	private numCurrentlyLoading = 0;

	constructor(audioContext, onPlaybackChange?: Function) {
		this.audioContext = audioContext;
		this.onPlaybackChange = onPlaybackChange;
	}

	init(reverbFile, dymoUris, callback) {
		//init horizontal listener orientation in degrees
		GlobalVars.DYMO_STORE.addParameter(null, LISTENER_ORIENTATION, 0, self);
		this.loadBuffers(dymoUris, callback);
		//init reverb if needed
		if (reverbFile && GlobalVars.DYMO_STORE.find(null, null, REVERB).length > 0) {
			this.convolverSend = this.audioContext.createConvolver();
			this.convolverSend.connect(this.audioContext.destination);
			this.loadAudio(reverbFile, buffer => {
				this.convolverSend.buffer = buffer;
				this.bufferLoaded(callback);
			});
		}
		//init delay if needed
		if (GlobalVars.DYMO_STORE.find(null, null, DELAY).length > 0) {
			var delaySend = this.audioContext.createDelay();
			delaySend.delayTime.value = 0.5;
			delaySend.connect(this.audioContext.destination);
			var delayFeedback = this.audioContext.createGain();
			delayFeedback.gain.value = 0.6;
			delaySend.connect(delayFeedback);
			delayFeedback.connect(delaySend);
		}
		//start observing play parameters
		GlobalVars.DYMO_STORE.addTypeObserver(PLAY, VALUE, self);
	}

	private loadBuffers(dymoUris: string[], callback) {
		//let allPaths = [];
		//console.log(GlobalVars.DYMO_STORE.find(null, HAS_PART).map(r => r.subject + " " + r.object));
		let allPaths = flattenArray(dymoUris.map(uri =>
			GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(uri).map(suburi => GlobalVars.DYMO_STORE.getSourcePath(suburi))
		));
		allPaths = allPaths.filter(p => typeof p === "string");
		allPaths = removeDuplicates(allPaths);
		allPaths.map(path => {
			//only add if not there yet..
			if (!this.buffers[path]) {
				this.loadAudio(path, buffer => {
					this.buffers[path] = buffer;
					this.bufferLoaded(callback);
				});
			}
		});
		if (this.numCurrentlyLoading == 0 && callback) {
			callback();
		}
	}

	getBuffer(dymoUri) {
		return this.buffers[GlobalVars.DYMO_STORE.getSourcePath(dymoUri)];
	}

	private bufferLoaded(callback?: Function) {
		if (this.numCurrentlyLoading > 0) {
			this.numCurrentlyLoading--;
		}
		if (this.numCurrentlyLoading == 0 && callback) {
			callback();
		}
	}

	updateNavigatorPosition(dymoUri, level, position) {
		for (var i = 0, ii = this.threads.length; i < ii; i++) {
			if (this.threads[i].hasDymo(dymoUri)) {
				this.threads[i].getNavigator().setPosition(position, level, dymoUri);
			}
		}
	}

	getNavigatorPosition(dymoUri, level) {
		for (var i = 0, ii = this.threads.length; i < ii; i++) {
			if (this.threads[i].hasDymo(dymoUri)) {
				return this.threads[i].getNavigator().getPosition(level, dymoUri);
			}
		}
	}

	//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	syncNavigators(syncDymo, goalDymo, level) {
		var syncNav, goalNav;
		for (var i = 0, ii = this.threads.length; i < ii; i++) {
			if (this.threads[i].hasDymo(syncDymo)) {
				syncNav = this.threads[i].getNavigator();
			}
			if (this.threads[i].hasDymo(goalDymo)) {
				goalNav = this.threads[i].getNavigator();
			}
		}
		//only sync if goalNav already exists..
		if (goalNav) {
			var position = goalNav.getPosition(level, goalDymo);
			syncNav.setPosition(position, level, syncDymo);
		}
	}

	play(dymoUri, navigator?: Navigator) {
		var thread = new SchedulerThread(dymoUri, navigator, this.audioContext, this.buffers, this.convolverSend, this.delaySend, this.updatePlayingDymos, this.threadEnded.bind(this));
		this.threads.push(thread);
	}

	pause(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < this.threads.length; i++) {
				this.threads[i].pause(dymoUri);
			}
		} else {

		}
	}

	stop(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < this.threads.length; i++) {
				this.threads[i].stop(dymoUri);
			}
		} else {

		}
	}

	/** @private returns all sources correponding to the given dymo */
	private getSources(dymoUri) {
		var sources = [];
		for (var i = 0; i < this.threads.length; i++) {
			var currentSources = this.threads[i].getSources(dymoUri);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					sources = sources.concat(currentSources);
				}
			}
		}
		return sources;
	}

	private threadEnded(thread) {
		this.threads.splice(this.threads.indexOf(thread), 1);
	}

	private updatePlayingDymos(changedThread) {
		if (!GlobalVars.OPTIMIZED_MODE) {
			var uris = Array.from(changedThread.getAllSources().keys());
			uris = flattenArray(uris.map(d => GlobalVars.DYMO_STORE.findAllParents(d)));
			uris = removeDuplicates(uris);
			uris.sort();
			this.urisOfPlayingDymos = uris;
			if (this.onPlaybackChange) {
				this.onPlaybackChange(this.urisOfPlayingDymos);
			}
		}
	}

	getUrisOfPlayingDymos() {
		return this.urisOfPlayingDymos;
	}

	observedValueChanged(paramUri, paramType, value) {
		if (paramType == LISTENER_ORIENTATION) {
			var angleInRadians = value / 180 * Math.PI;
			this.audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
		} else if (paramType == PLAY) {
			var dymoUri = GlobalVars.DYMO_STORE.findSubject(HAS_PARAMETER, paramUri);
			if (value > 0) {
				this.play(dymoUri);
			} else {
				this.stop(dymoUri);
			}
		}
	}

	private loadAudio(path, callback) {
		//console.log(path)
		this.numCurrentlyLoading++;
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = () => this.audioContext.decodeAudioData(request.response, buffer => callback(buffer));
		request.send();
	}

}
