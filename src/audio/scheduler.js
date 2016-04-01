/**
 * Manages playing back any number of dymos.
 * @constructor
 * @param {Function=} onPlaybackChange (optional)
 */
function Scheduler(audioContext, onSourcesChange, onPlaybackChange) {
	
	var self = this;
	
	var buffers = {};
	var threads = [];
	var urisOfPlayingDymos = [];
	
	//horizontal listener orientation in degrees
	this.listenerOrientation = new Parameter(this, 0);
	
	var convolverSend = audioContext.createConvolver();
	convolverSend.connect(audioContext.destination);
	
	var numCurrentlyLoading = 0;
	
	this.setReverbFile = function(filePath) {
		loadAudio(filePath, function(buffer) {
			convolverSend.buffer = buffer;
			sourceReady();
		});
	}
	
	this.loadBuffers = function(dymo) {
		var allPaths = dymo.getAllSourcePaths();
		for (var i = 0, ii = allPaths.length; i < ii; i++) {
			if (!buffers[allPaths[i]]) {
				//only add if not there yet..
				loadAudio(allPaths[i]);
			}
		}
	}
	
	this.getBuffer = function(dymo) {
		return buffers[dymo.getSourcePath()];
	}
	
	function sourceReady() {
		if (numCurrentlyLoading > 0) {
			numCurrentlyLoading--;
		}
		if (numCurrentlyLoading == 0 && onSourcesChange) {
			onSourcesChange(numCurrentlyLoading);
		}
	}
	
	this.play = function(dymo) {
		dymo.updatePartOrder(ONSET); //TODO WHERE TO PUT THIS??
		var thread = new SchedulerThread(dymo, undefined, audioContext, buffers, convolverSend, updatePlayingDymos, threadEnded);
		threads.push(thread);
	}
	
	this.pause = function(dymo) {
		if (dymo) {
			for (var i = 0; i < threads.length; i++) {
				threads[i].pause(dymo);
			}
		} else {
			
		}
	}
	
	this.stop = function(dymo) {
		if (dymo) {
			for (var i = 0; i < threads.length; i++) {
				threads[i].stop(dymo);
			}
		} else {
			
		}
	}
	
	/** @private returns all sources correponding to the given dymo */
	this.getSources = function(dymo) {
		var sources = [];
		for (var i = 0; i < threads.length; i++) {
			var currentSource = threads[i].getSource(dymo);
			if (currentSource) {
				sources.push(currentSource);
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
			for (var currentDymo of threads[i].getSources().keys()) {
				while (currentDymo != null) {
					if (uris.indexOf(currentDymo.getUri()) < 0) {
						uris.push(currentDymo.getUri());
					}
					currentDymo = currentDymo.getParent();
				}
			}
		}
		uris.sort();
		urisOfPlayingDymos = uris;
		if (onPlaybackChange) {
			onPlaybackChange();
		}
	}
	
	this.getUrisOfPlayingDymos = function() {
		return urisOfPlayingDymos;
	}
	
	this.updateListenerOrientation = function() {
		var angleInRadians = this.listenerOrientation.getValue() / 180 * Math.PI;
		audioContext.listener.setOrientation(Math.sin(angleInRadians), 0, -Math.cos(angleInRadians), 0, 1, 0);
	}
	
	/** @param {Function=} callback (optional) */
	function loadAudio(path, callback) {
		console.log(path)
		numCurrentlyLoading++;
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				if (callback) {
					callback(buffer);
				} else {
					buffers[path] = buffer;
					sourceReady();
				}
			});
		}
		request.error = function(){};
		request.send();
	}
	
}