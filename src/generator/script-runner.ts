import 'isomorphic-fetch';
import * as fs from 'fs';
import * as express from 'express';
import { PerformanceDymos } from './performance-dymos';

let PORT = '4111';
let SERVER_PATH = 'http://localhost:' + PORT + '/';

var app = express();
app.use(express["static"](__dirname));
var server = app.listen(PORT);
console.log('server started at '+SERVER_PATH);

var AUDIO_PATH = 'audio/Lou01XP_zerooffset/'//'audio/Chopin_Op028-11_003_20100611-SMD-cut/';
var AUDIO_PATH2 = 'audio/Lee01XP_zerooffset/';
var CONTEXT1 = 'http://tiny.cc/dymo-context';
var CONTEXT2 = 'http://localhost:4200/node_modules/dymo-core/ontologies/dymo-context.json';

/*createAndSaveDoublePerformanceDymo([AUDIO_PATH, AUDIO_PATH2], 'output/dymo.json', 'output/rendering.json')
  .then(() => console.log('done'))
  .then(() => server.close())
  .catch(e => console.log(e));*/

createAndSavePerformanceDymo(AUDIO_PATH, 'output/dymo.json', 'output/rendering.json')
  .then(() => console.log('done'))
  .then(() => server.close())
  .catch(e => console.log(e));

function createAndSaveDoublePerformanceDymo(audioPaths: string[], dymoOutPath: string, renderingOutPath: string): Promise<any> {
  return Promise.all(audioPaths.map(p => getFilesInDir(p, ['wav'])))
    .then(files => files.map(fs => fs.map(f => 'audio/' + f)))
    .then(files => new PerformanceDymos().createDoublePerformanceDymo(files))
    .then(jsonlds => jsonlds.map(j => j.replace(CONTEXT1, CONTEXT2)))
    .then(jsonlds => { writeFile(jsonlds[0], dymoOutPath); writeFile(jsonlds[1], renderingOutPath); })
    .catch(e => console.log(e));
}

function createAndSavePerformanceDymo(audioPath: string, dymoOutPath: string, renderingOutPath: string): Promise<any> {
  return getFilesInDir(audioPath, ['wav'])
    .then(files => files.map(f => 'audio/'+f))
    .then(files => new PerformanceDymos().createFullPerformanceDymo(files))
    .then(jsonlds => jsonlds.map(j => j.replace(CONTEXT1, CONTEXT2)))
    .then(jsonlds => { writeFile(jsonlds[0], dymoOutPath); writeFile(jsonlds[1], renderingOutPath); } )
    .catch(e => console.log(e));
}

function getFilesInDir(dirPath: string, fileTypes: string[]): Promise<string[]> {
  return new Promise(resolve => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        console.log(err);
      } else if (files) {
        var files = files.filter(f =>
          //check if right extension
          fileTypes.indexOf(f.split('.').slice(-1)[0]) >= 0
        );
      }
      resolve(files);
    });
  });
}

function writeFile(content: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, function (err) {
      if (err) return reject(err);
      resolve('file saved at ' + path);
    });
  });
}