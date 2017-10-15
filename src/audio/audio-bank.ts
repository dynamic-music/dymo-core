import { Fetcher, FetchFetcher } from '../util/fetcher';

export class AudioBank {

  constructor(private audioContext: AudioContext, private fetcher: Fetcher = new FetchFetcher()) {}

  private buffers = new Map<string, AudioBuffer>();

  /** returns a buffer immediately but only if it has been previously loaded */
  getLoadedBuffer(filePath: string): AudioBuffer {
    return this.buffers.get(filePath);
  }

  /** returns the corresponding array of buffers and loads them if necessary */
  loadBuffers(...filePaths: string[]): Promise<AudioBuffer[]> {
    return Promise.all(filePaths.map(path => this.loadBuffer(path)));
  }

  /** returns the corresponding buffer and loads it if necessary */
  loadBuffer(filePath: string): Promise<AudioBuffer> {
    return new Promise(resolve => {
      //only add if not there yet..
      if (!this.buffers.get(filePath)) {
        this.fetcher.fetchArrayBuffer(filePath)
          .then(r => new Promise<AudioBuffer>((resolve, reject) => {
            if (this.audioContext) {
              //need to keep this syntax for node web-audio-api (used in tests)
              this.audioContext.decodeAudioData(r, buffer => resolve(buffer), error => reject(error));
            }
          }))
          .then(buffer => {
            this.buffers.set(filePath, buffer);
            resolve(this.buffers.get(filePath));
          })
          .catch(e => console.log(e));
      } else {
        resolve(this.buffers.get(filePath));
      }
    });
  }

}