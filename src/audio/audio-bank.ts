export class AudioBank {

  constructor(private audioContext: AudioContext) {}

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
        this.loadAudio(filePath)
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

  private loadAudio(path): Promise<AudioBuffer> {
    return fetch(path, {
      //mode:'cors',
      /*headers: new Headers({
        'Content-Type': 'arraybuffer'
      })*/
    })
    .then(r => {
      if (r.ok) {
        return this.toArrayBuffer(r)
        .then(r => new Promise<AudioBuffer>((resolve, reject) => {
          if (this.audioContext) {
            //need to keep this syntax for node web-audio-api (used in tests)
            this.audioContext.decodeAudioData(r, buffer => resolve(buffer), error => reject(error));
          }
        }))
        .catch(e => Promise.reject(e));
      } else {
        return Promise.reject(r.status + " " + r.statusText + " " + path);
      }
    });

  }

  private toArrayBuffer(response) {
    if (response.arrayBuffer) {
      return response.arrayBuffer();
    } else {
      // isomorphic-fetch does not support response.arrayBuffer
      return new Promise((resolve, reject) => {
        let chunks = [];
        let bytes = 0;

        response.body.on('error', err => {
          reject("invalid audio url");
        });

        response.body.on('data', chunk => {
          chunks.push(chunk);
          bytes += chunk.length;
        });

        response.body.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    }
  }

}