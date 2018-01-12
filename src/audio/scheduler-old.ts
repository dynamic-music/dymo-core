import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { flattenArray, removeDuplicates } from 'arrayutils';
import { DymoStore } from '../io/dymostore';
import { GlobalVars } from '../globals/globals'
import { LISTENER_ORIENTATION, REVERB, DELAY, PLAY, VALUE, HAS_PARAMETER, CONTEXT_URI } from '../globals/uris'
import { AudioBank } from './audio-bank';
import { SchedulerThread } from './thread'
import { DymoNavigator } from '../navigators/navigator';
import { Schedulo } from 'schedulo';
declare const Buffer;

/**
 * Manages playing back any number of dymos.
 */
export class Scheduler {

	private schedulo = new Schedulo();
	private threads: SchedulerThread[] = [];
	private playingDymoUris: BehaviorSubject<string[]> = new BehaviorSubject([]);

	private convolverSend;
	private delaySend;

	constructor(private audioContext: AudioContext, private audioBank: AudioBank, private store: DymoStore) {
		this.schedulo.start();
	}

	getStore(): DymoStore {
		return this.store;
	}

	getSchedulo(): Schedulo {
		return this.schedulo;
	}

	getPlayingDymoUris(): Observable<string[]> {
		return this.playingDymoUris.asObservable();
	}

	init(reverbFile, dymoUris): Promise<any> {
		if (this.audioContext) {
			//init horizontal listener orientation in degrees
			this.store.setParameter(null, LISTENER_ORIENTATION, 0);
			this.store.addParameterObserver(null, LISTENER_ORIENTATION, this);
			let loadingPromises = [this.loadBuffers(dymoUris)];

			//init reverb if needed
			if (this.audioContext.createConvolver && reverbFile && (!GlobalVars.OPTIMIZED_MODE || this.store.find(null, null, REVERB).length > 0)) {
				this.convolverSend = this.audioContext.createConvolver();
				this.convolverSend.connect(this.audioContext.destination);
				loadingPromises.push(this.loadReverbFile(reverbFile));
			}

			//init delay if needed
			if (this.audioContext.createDelay && (!GlobalVars.OPTIMIZED_MODE || this.store.find(null, null, DELAY).length > 0)) {
				this.delaySend = this.audioContext.createDelay();
				this.delaySend.delayTime.value = 0.5;
				this.delaySend.connect(this.audioContext.destination);
				var delayFeedback = this.audioContext.createGain();
				delayFeedback.gain.value = 0.6;
				this.delaySend.connect(delayFeedback);
				delayFeedback.connect(this.delaySend);
			}
			//start observing play parameters
			this.store.addTypeObserver(PLAY, VALUE, this);
			return Promise.all(loadingPromises);
		}
		return Promise.resolve();
	}

	private loadReverbFile(reverbFile): Promise<any> {
		return this.audioBank.loadBuffer(reverbFile)
			.then(buffer => this.convolverSend.buffer = buffer);
	}

	private loadBuffers(dymoUris: string[]): Promise<AudioBuffer[]> {
		//let allPaths = [];
		//console.log(this.store.find(null, HAS_PART).map(r => r.subject + " " + r.object));
		let allPaths = flattenArray(dymoUris.map(uri =>
			this.store.findAllObjectsInHierarchy(uri).map(suburi => this.store.getSourcePath(suburi))
		));
		allPaths = allPaths.filter(p => typeof p === "string");
		allPaths = removeDuplicates(allPaths);
		return this.audioBank.loadBuffers(...allPaths);
	}

	getBuffer(dymoUri) {
		return this.audioBank.loadBuffer(this.store.getSourcePath(dymoUri));
	}

	updateNavigatorPosition(dymoUri, level, position) {
		for (var i = 0, ii = this.threads.length; i < ii; i++) {
			if (this.threads[i].hasDymo(dymoUri)) {
				this.threads[i].getNavigator().setPosition(position, level, dymoUri);
			}
		}
	}

	getNavigatorPosition(dymoUri: string): number {
		for (var i = 0, ii = this.threads.length; i < ii; i++) {
			if (this.threads[i].hasDymo(dymoUri)) {
				return this.threads[i].getNavigator().getPosition(dymoUri);
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

	play(dymoUri, navigator?: DymoNavigator) {
		var thread = new SchedulerThread(dymoUri, this, navigator);
		this.threads.push(thread);
	}

	/*pause(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < this.threads.length; i++) {
				this.threads[i].pause(dymoUri);
			}
		} else {

		}
	}*/

	stop(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < this.threads.length; i++) {
				this.threads[i].stop(dymoUri);
			}
		} else {

		}
	}

	threadEnded(thread: SchedulerThread) {
		this.threads.splice(this.threads.indexOf(thread), 1);
	}

	objectStarted(objectAndParentUris: string[]) {
		let uris = this.playingDymoUris.getValue();
		uris.concat(objectAndParentUris);
		this.updatePlayingDymos(uris);
	}

	objectStopped() {
		let uris = flattenArray(this.threads.map(t => t.getPlayingDymoUris()));
		this.updatePlayingDymos(uris);
	}

	private updatePlayingDymos(uris: string[]) {
		uris = removeDuplicates(uris);
		uris.sort();
		uris = uris.map(uri => uri.replace(CONTEXT_URI, ""));
		this.playingDymoUris.next(uris);
	}

	getUrisOfPlayingDymos(): string[] {
		return this.playingDymoUris.getValue();
	}

	observedValueChanged(paramUri, paramType, value) {
		if (paramType == LISTENER_ORIENTATION) {
			var angleInRadians = value / 180 * Math.PI;
			this.audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
		} else if (paramType == PLAY) {
			var dymoUri = this.store.findSubject(HAS_PARAMETER, paramUri);
			if (value > 0) {
				this.play(dymoUri);
			} else {
				this.stop(dymoUri);
			}
		}
	}

}
