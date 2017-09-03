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
        this.loadAudio(filePath, buffer => {
          this.buffers.set(filePath, buffer);
          resolve(this.buffers.get(filePath));
        });
      } else {
        resolve(this.buffers.get(filePath));
      }
    });
  }

  private loadAudio(path, callback) {
    fetch(path, {
      //mode:'cors',
      /*headers: new Headers({
        'Content-Type': 'arraybuffer'
      })*/
    })
    .then(r => this.toArrayBuffer(r))
    //.then(r => {return r.body.getReader().read()})
    //.then(value => this.audioContext.decodeAudioData(value.buffer, buffer => callback(buffer)))
    .then(r => this.audioContext ? this.audioContext.decodeAudioData(r, buffer => callback(buffer)) : null)
    .catch(e => console.log(e));

    /*var request = new XMLHttpRequest();
    request.open('GET', path, true);
    request.responseType = 'arraybuffer';
    request.onload = () => this.audioContext.decodeAudioData(request.response, buffer => callback(buffer));
    request.send();*/
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