import * as express from 'express';
import { AudioContext } from 'web-audio-api';
import * as Speaker from 'speaker';
var __dirname;

export var PORT = 8181;
export var SERVER_ROOT = 'http://localhost:'+PORT+'/';
var app = express();

app.use(express["static"](__dirname+'/../../../../'));

export var SERVER = app.listen(PORT, () => {
  console.log('spec server started on '+PORT+'!')
});

export var AUDIO_CONTEXT = new AudioContext();

export function initSpeaker() {
  AUDIO_CONTEXT.outStream = new Speaker({
    channels: AUDIO_CONTEXT.format.numberOfChannels,
    bitDepth: AUDIO_CONTEXT.format.bitDepth,
    sampleRate: AUDIO_CONTEXT.sampleRate
  });
}

export function endSpeaker() {
  if (AUDIO_CONTEXT.outStream) {
    AUDIO_CONTEXT.outStream.end();
    AUDIO_CONTEXT.outStream = null;
  }
}