/**
 * Manages playing back any number of dymos.
 * @constructor
 * @param {Function=} onPlaybackChange (optional)
 */
function Scheduler(audioContext, onPlaybackChange) {

	var self = this;

	var buffers = {};
	var threads = [];
	var urisOfPlayingDymos = [];

	var convolverSend, delaySend;
	var numCurrentlyLoading = 0;

	this.init = function(reverbFile) {
		//init horizontal listener orientation in degrees
		DYMO_STORE.addParameter(null, LISTENER_ORIENTATION, 0, self);
		//init reverb if needed
		if (DYMO_STORE.find(null, null, REVERB).length > 0) {
			convolverSend = audioContext.createConvolver();
			convolverSend.connect(audioContext.destination);
			loadAudio(reverbFile, function(buffer) {
				convolverSend.buffer = buffer;
				bufferLoaded();
			});
		}
		//init delay if needed
		if (DYMO_STORE.find(null, null, DELAY).length > 0) {
			var delaySend = audioContext.createDelay();
			delaySend.delayTime.value = 0.5;
			delaySend.connect(audioContext.destination);
			var delayFeedback = audioContext.createGain();
			delayFeedback.gain.value = 0.6;
			delaySend.connect(delayFeedback);
			delayFeedback.connect(delaySend);
		}
		//start observing play parameters
		DYMO_STORE.addTypeObserver(PLAY, VALUE, self);
	}

	/** @param {Array<string>} dymoUris */
	this.loadBuffers = function(dymoUris, callback) {
		var allPaths = [];
		//console.log(DYMO_STORE.find(null, HAS_PART).map(function(r){return r.subject + " " + r.object;}));
		for (var i = 0, ii = dymoUris.length; i < ii; i++) {
			var allSubDymos = DYMO_STORE.findAllObjectsInHierarchy(dymoUris[i]);
			allPaths = allPaths.concat(allSubDymos.map(function(d){return DYMO_STORE.getSourcePath(d)}));
		}
		for (var i = 0, ii = allPaths.length; i < ii; i++) {
			//only add if not there yet..
			if (allPaths[i] && !buffers[allPaths[i]]) {
				loadAudio(allPaths[i], function(buffer, path) {
					buffers[path] = buffer;
					bufferLoaded(callback);
				});
			}
		}
		if (numCurrentlyLoading == 0 && callback) {
			callback();
		}
	}

	this.getBuffer = function(dymoUri) {
		return buffers[DYMO_STORE.getSourcePath(dymoUri)];
	}

	/** @param {Function=} callback (optional) */
	function bufferLoaded(callback) {
		if (numCurrentlyLoading > 0) {
			numCurrentlyLoading--;
		}
		if (numCurrentlyLoading == 0 && callback) {
			callback();
		}
	}

	this.updateNavigatorPosition = function(dymoUri, level, position) {
		for (var i = 0, ii = threads.length; i < ii; i++) {
			if (threads[i].hasDymo(dymoUri)) {
				threads[i].getNavigator().setPosition(position, level, dymoUri);
			}
		}
	}

	this.getNavigatorPosition = function(dymoUri, level) {
		for (var i = 0, ii = threads.length; i < ii; i++) {
			if (threads[i].hasDymo(dymoUri)) {
				return threads[i].getNavigator().getPosition(level, dymoUri);
			}
		}
	}

	//sync the first navigator for syncDymo to the position of the first for goalDymo on the given level
	this.syncNavigators = function(syncDymo, goalDymo, level) {
		var syncNav, goalNav;
		for (var i = 0, ii = threads.length; i < ii; i++) {
			if (threads[i].hasDymo(syncDymo)) {
				syncNav = threads[i].getNavigator();
			}
			if (threads[i].hasDymo(goalDymo)) {
				goalNav = threads[i].getNavigator();
			}
		}
		//only sync if goalNav already exists..
		if (goalNav) {
			var position = goalNav.getPosition(level, goalDymo);
			syncNav.setPosition(position, level, syncDymo);
		}
	}

	/** @param {Navigator=} navigator (optional) */
	this.play = function(dymoUri, navigator) {
		var thread = new SchedulerThread(dymoUri, navigator, audioContext, buffers, convolverSend, delaySend, updatePlayingDymos, threadEnded);
		threads.push(thread);
	}

	this.pause = function(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < threads.length; i++) {
				threads[i].pause(dymoUri);
			}
		} else {

		}
	}

	this.stop = function(dymoUri) {
		if (dymoUri) {
			for (var i = 0; i < threads.length; i++) {
				threads[i].stop(dymoUri);
			}
		} else {

		}
	}

	/** @private returns all sources correponding to the given dymo */
	this.getSources = function(dymoUri) {
		var sources = [];
		for (var i = 0; i < threads.length; i++) {
			var currentSources = threads[i].getSources(dymoUri);
			if (currentSources) {
				for (var j = 0; j < currentSources.length; j++) {
					sources = sources.concat(currentSources);
				}
			}
		}
		return sources;
	}

	function threadEnded(thread) {
		threads.splice(threads.indexOf(thread), 1);
	}

	function updatePlayingDymos() {
		var uris = [];
		for (var i = 0; i < threads.length; i++) {
			for (var currentDymoUri of threads[i].getAllSources().keys()) {
				while (currentDymoUri != null) {
					if (uris.indexOf(currentDymoUri) < 0) {
						uris.push(currentDymoUri);
					}
					currentDymoUri = DYMO_STORE.findParents(currentDymoUri)[0];
				}
			}
		}
		uris.sort();
		urisOfPlayingDymos = uris;
		if (onPlaybackChange) {
			onPlaybackChange(urisOfPlayingDymos);
		}
	}

	this.getUrisOfPlayingDymos = function() {
		return urisOfPlayingDymos;
	}

	this.observedValueChanged = function(paramUri, paramType, value) {
		if (paramType == LISTENER_ORIENTATION) {
			var angleInRadians = value / 180 * Math.PI;
			audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
		} else if (paramType == PLAY) {
			var dymoUri = DYMO_STORE.findSubject(HAS_PARAMETER, paramUri);
			if (value > 0) {
				this.play(dymoUri);
			} else {
				this.stop(dymoUri);
			}
		}
	}

	function loadAudio(path, callback) {
		//console.log(path)
		numCurrentlyLoading++;
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				callback(buffer, path);
			});
		}
		request.error = function(){};
		request.send();
	}

}
