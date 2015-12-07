function AudioProcessorSource(audioContext, buffer, destination) {
	
	var self = this;
	
	var soundTouch = new SoundTouch();
	
	this.stretchRatio = {
		setValue:function(value) {
			soundTouch.tempo = value;
		},
		getValue:function() {
			return soundTouch.tempo;
		}
	};
	this.playbackRate = {
		setValue:function(value) {
			soundTouch.playbackRate = value;
		},
		getValue:function() {
			return soundTouch.playbackRate;
		}
	};
	
	var BUFFER_SIZE = 1024;
	
	var source = {
	    extract: function (target, numFrames, position) {
	        var l = buffer.getChannelData(0);
	        var r = buffer.getChannelData(1);
	        for (var i = 0; i < numFrames; i++) {
	            target[i * 2] = l[i + position];
	            target[i * 2 + 1] = r[i + position];
	        }
	        return Math.min(numFrames, l.length - position);
	    }
	};
	
	var f = new SimpleFilter(source, soundTouch);
	
	var node = audioContext.createScriptProcessor(BUFFER_SIZE, 2, 2);
	
	var samples = new Float32Array(BUFFER_SIZE * 2);
	
	node.onaudioprocess = function (e) {
	    var l = e.outputBuffer.getChannelData(0);
	    var r = e.outputBuffer.getChannelData(1);
	    var framesExtracted = f.extract(samples, BUFFER_SIZE);
	    if (framesExtracted == 0) {
				node.disconnect();
	    }
	    for (var i = 0; i < framesExtracted; i++) {
	        l[i] = samples[i * 2];
	        r[i] = samples[i * 2 + 1];
	    }
	};

	this.start = function(delay) {
		setTimeout(function(){
			node.connect(destination);
		}, delay);
	}
	
	this.stop = function() {
		node.disconnect();
	}

}