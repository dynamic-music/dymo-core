import * as _ from 'lodash';
import { uris } from '../index';
import { DymoGenerator } from './dymo-generator';
import { ExpressionGenerator } from './expression-generator';
import { DymoTemplates as dt } from './dymo-templates';

interface ParseInfo {
  index: number, //segmentIndex
  prefix: number, //prefixLength
  divisor?: number, //divisor
  min?: number //min value
}

interface FileInfo {
  name: string,
  scoreValues: Object,
  perfValues: Object
}

var SCORE_ONSET = uris.CONTEXT_URI+"scoreOnset";
var SCORE_DURATION = uris.CONTEXT_URI+"scoreDuration";
var SCORE_PITCH = uris.CONTEXT_URI+"scorePitch";
var SCORE_VELOCITY = uris.CONTEXT_URI+"scoreVelocity";
var PERF_ONSET = uris.ONSET_FEATURE;
var PERF_DURATION = uris.DURATION_FEATURE;
var PERF_VELOCITY = uris.CONTEXT_URI+"velocity";

//Chopin_Op028-11_003_20100611-SMD-cut_p030_ne0001_po033220_pd001926_pv028_so076500_sd001500
var OLD_SCORE_PARSE_INFO = {};
OLD_SCORE_PARSE_INFO[SCORE_ONSET] = {index: 9, prefix: 2, divisor: 1000, min: 0};
OLD_SCORE_PARSE_INFO[SCORE_DURATION] = {index: 10, prefix: 2, divisor: 1000, min: 0};
OLD_SCORE_PARSE_INFO[SCORE_PITCH] = {index: 4, prefix: 1};
var OLD_PERF_PARSE_INFO = {};
OLD_PERF_PARSE_INFO[PERF_ONSET] = {index: 6, prefix: 2, divisor: 1000};
OLD_PERF_PARSE_INFO[PERF_DURATION] = {index: 7, prefix: 2, divisor: 1000};
OLD_PERF_PARSE_INFO[PERF_VELOCITY] = {index: 8, prefix: 2};

//Lee01XP_zerooffset_p037_ne1661_pss149089_pd001078_pv046_so290000_sd000998_sv000080
var NEW_SCORE_PARSE_INFO = {};
NEW_SCORE_PARSE_INFO[SCORE_ONSET] = {index: 7, prefix: 2, divisor: 1000, min: 0};
NEW_SCORE_PARSE_INFO[SCORE_DURATION] = {index: 8, prefix: 2, divisor: 1000, min: 0};
NEW_SCORE_PARSE_INFO[SCORE_VELOCITY] = {index: 9, prefix: 2};
NEW_SCORE_PARSE_INFO[SCORE_PITCH] = {index: 2, prefix: 1};
var NEW_PERF_PARSE_INFO = {};
NEW_PERF_PARSE_INFO[PERF_ONSET] = {index: 4, prefix: 3, divisor: 1000};
NEW_PERF_PARSE_INFO[PERF_DURATION] = {index: 5, prefix: 2, divisor: 1000};
NEW_PERF_PARSE_INFO[PERF_VELOCITY] = {index: 6, prefix: 2};


export class PerformanceDymos {

  private generator = new DymoGenerator();

  //var dirPath = 'audio/Chopin_Op028-04_003_20100611-SMD/';
  //var dirPath = 'audio/scale_out/scale_single/';
  createSimplePerformanceDymo(audioFileNames: string[]): string {
    let parseInfo = {};
    parseInfo[uris.ONSET_FEATURE] = {index: 4, prefix: 1, divisor: 1000};
    parseInfo[uris.PITCH_FEATURE] = {index: 2, prefix: 2};
    let fileInfos = this.parseFileInfos(audioFileNames, parseInfo, {});
    return this.addPerformanceDymo(fileInfos);
  }

  createDoublePerformanceDymo(audioFileNames: string[][]): Promise<string[]> {
    var fileInfos = audioFileNames.map(a => this.getSortedSlicedFileInfos(a));
    var [scoreDymo, perfDymo1] = this.addScoreAndPerformanceDymos(fileInfos[0]);
    var perfDymo2 = this.addAdditionalPerformanceDymo(fileInfos[1], scoreDymo);
    console.log(scoreDymo, perfDymo1, perfDymo2)

    return Promise.all([
      this.generator.getManager().getStore().uriToJsonld(perfDymo1),
      this.generator.getRenderingJsonld()
    ]);
  }

  private getSortedSlicedFileInfos(audioFileNames: string[]) {
    var fileInfos = this.parseFileInfos(audioFileNames, NEW_SCORE_PARSE_INFO, NEW_PERF_PARSE_INFO);
    fileInfos.sort((a,b) => a.perfValues[PERF_ONSET]-b.perfValues[PERF_ONSET]);
    return fileInfos.slice(0,100);
  }

  //TODO CREATE REAL REPRESENTATION WITH SCORE AND PERFORMANCE!!!!!
  //var dirPath = 'audio/Chopin_Op028-11_003_20100611-SMD-cut/';
  createFullPerformanceDymo(audioFileNames: string[]): Promise<string[]> {
    var fileInfos = this.parseFileInfos(audioFileNames, NEW_SCORE_PARSE_INFO, NEW_PERF_PARSE_INFO);
    fileInfos.sort((a,b) => a.perfValues[PERF_ONSET]-b.perfValues[PERF_ONSET]);
    fileInfos = fileInfos.slice(0,100);
    //console.log(fileInfos.slice(0,5));
    this.addPerformanceDymo(fileInfos);

    var renderingUri = this.generator.addRendering();
    var timeSliderUri = this.generator.addControl("Timing", uris.SLIDER, null, 1);
    this.addDeformationConstraint(fileInfos, SCORE_ONSET, PERF_ONSET, uris.ONSET, timeSliderUri, renderingUri);
    //var dynamicsSliderUri = this.generator.addControl("Dynamics", uris.SLIDER);
    //this.addDeformationMapping2(fileInfos, SCORE_VELOCITY, PERF_VELOCITY, uris.AMPLITUDE, dynamicsSliderUri, renderingUri);

    return Promise.all([
      this.generator.getTopDymoJsonld(),
      this.generator.getRenderingJsonld()
        .then(j => {
          j = JSON.parse(j);
          j["dymo"] = j["dymo"]["@id"];
          return JSON.stringify(j);
        })
    ]);
  }

  private addDeformationConstraint(fileInfos: FileInfo[], scoreFeature: string, perfFeature: string, parameter: string, sliderUri: string, renderingUri: string) {
    let [conv, pMin, pMax, sMin, sMax] = this.getConvAndMinMax(fileInfos, scoreFeature, perfFeature);
    //generator.getManager().getStore().addFeature();
    let exp = `
      ∀ x : `+uris.DYMO+`, LevelFeature(x) == 1
      => ∀ d in ["`+sliderUri+`"]
      => `+parameter+`(x) == pf(x) + 2 * (2*(d-0.5)) * (pf(x)-((sf(x)-`+sMin+`)*`+conv+`+`+pMin+`))
    `;
    exp = _.replace(exp, /pf/g, perfFeature);
    exp = _.replace(exp, /sf/g, scoreFeature);
    exp = exp.replace(new RegExp(uris.DYMO_ONTOLOGY_URI, 'g'), '');
    exp = exp.replace(new RegExp(uris.CONTEXT_URI, 'g'), '');
    exp = exp.replace('Dymo', uris.DYMO);
    console.log(exp);
    new ExpressionGenerator(this.generator.getManager().getStore()).addConstraint(renderingUri, exp, true);
  }

  private addDeformationMapping(fileInfos: FileInfo[], scoreFeature: string, perfFeature: string, parameter: string, sliderUri: string, renderingUri: string) {
    let [conv, pMin, pMax, sMin, sMax] = this.getConvAndMinMax(fileInfos, scoreFeature, perfFeature);
    //generator.getManager().getStore().addFeature();
    var functionBody = "return p + 2 * (2*(d-0.5)) * (p-((s-"+sMin+")*"+conv+"+"+pMin+"))";
    console.log(functionBody)
    var functionUri = this.generator.getManager().getStore().addFunction({
      "p":perfFeature,
      "s":scoreFeature,
      "d":sliderUri
    }, functionBody);
    var targetFuncUri = this.generator.getManager().getStore().addFunction({"l":uris.LEVEL_FEATURE}, "return l == 1;");
    this.generator.addMapping(renderingUri, functionUri, null, targetFuncUri, parameter);
  }

  private addDeformationMapping2(fileInfos: FileInfo[], scoreFeature: string, perfFeature: string, parameter: string, sliderUri: string, renderingUri: string) {
    let [conv, pMin, pMax, sMin, sMax] = this.getConvAndMinMax(fileInfos, scoreFeature, perfFeature);
    //generator.getManager().getStore().addFeature();
    var functionBody = "return Math.pow(0.5 + ((d - 0.5) * ((p-"+pMin+")/("+pMax+"-"+pMin+"))), 1)";
    console.log(functionBody)
    var functionUri = this.generator.getManager().getStore().addFunction({
      "p":perfFeature,
      "d":sliderUri
    }, functionBody);
    var targetFuncUri = this.generator.getManager().getStore().addFunction({"l":uris.LEVEL_FEATURE}, "return l == 1;");
    this.generator.addMapping(renderingUri, functionUri, null, targetFuncUri, parameter);
  }

  private getConvAndMinMax(fileInfos: FileInfo[], scoreFeature: string, perfFeature: string): string[] {
    var scoreVals = fileInfos.map(i => i.scoreValues[scoreFeature]);
    var perfVals = fileInfos.map(i => i.perfValues[perfFeature]);
    var sMin = _.min(scoreVals);
    var sMax = _.max(scoreVals);
    var pMin = _.min(perfVals);
    var pMax = _.max(perfVals);
    console.log(pMax, pMin, sMax, sMin);
    var conv = sMax !== sMin? (pMax-pMin)/(sMax-sMin) : pMax-pMin;
    return [conv, pMin, pMax, sMin, sMax];
  }

  private parseFileInfos(audioFileNames: string[], scoreParseInfo: Object, perfParseInfo: Object): FileInfo[] {
    let infos = <ParseInfo[]>_.values(scoreParseInfo).concat(_.values(perfParseInfo));
    let maxIndex = _.max(infos.map(pi => pi.index));
    return audioFileNames
      //only take filenames that contain enough info
      .filter(filename => filename.split("_").length - 1 >= maxIndex)
      .map(filename => { return {
        name: filename,
        scoreValues: _.mapValues(scoreParseInfo, p => this.parseValue(filename, p)),
        perfValues: _.mapValues(perfParseInfo, p => this.parseValue(filename, p))
      }});
  }

  private addScoreAndPerformanceDymos(fileInfos: FileInfo[]): string[] {
    let scoreDymo = this.generator.addDymo();
    let perfDymo = this.generator.addDymo();
    fileInfos.forEach(info => {
      let currentScoreEvent = this.generator.addDymo(scoreDymo);
      let currentPerfEvent = this.generator.addDymo(perfDymo);
      _.keys(info.scoreValues).forEach(k => this.generator.setDymoFeature(currentScoreEvent, k, info.scoreValues[k]));
      _.keys(info.perfValues).forEach(k => this.generator.setDymoFeature(currentPerfEvent, k, info.perfValues[k]));
      this.generator.setDymoParameter(currentPerfEvent, uris.ONSET, info.perfValues[PERF_ONSET]);
      this.generator.getManager().getStore().addTriple(currentPerfEvent, uris.HAS_SIMILAR, currentScoreEvent);
    });
    return [scoreDymo, perfDymo];
  }

  private addAdditionalPerformanceDymo(fileInfos: FileInfo[], scoreDymo: string): string {
    let perfDymo = this.generator.addDymo();
    fileInfos.forEach(info => {
      let currentScoreEvent = this.findCorrespondingScoreDymo(info, scoreDymo);
      let currentPerfEvent = this.generator.addDymo(perfDymo);
      _.keys(info.perfValues).forEach(k => this.generator.setDymoFeature(currentPerfEvent, k, info.perfValues[k]));
      this.generator.setDymoParameter(currentPerfEvent, uris.ONSET, info.perfValues[PERF_ONSET]);
      this.generator.getManager().getStore().addTriple(currentPerfEvent, uris.HAS_SIMILAR, currentScoreEvent);
    });
    return perfDymo;
  }

  private findCorrespondingScoreDymo(fileInfo: FileInfo, scoreDymoUri: string): string {
    let store = this.generator.getManager().getStore();
    let scoreEvents = store.findParts(scoreDymoUri);
    return scoreEvents.filter(e => _.keys(fileInfo.scoreValues).every(k => store.findFeatureValue(e, k) === fileInfo.scoreValues[k]))[0];
  }

  private addPerformanceDymo(fileInfos: FileInfo[]): string {
    let perfDymo = this.generator.addDymo();
    //scoreFeatures.concat(perfFeatures).forEach(f => generator.setDymoFeature(perfDymo, f, 0));
    fileInfos
      //only take filenames that contain enough info
      .forEach(info => {
        let currentDymo = this.generator.addDymo(perfDymo, info.name);
        _.keys(info.scoreValues).forEach(k => this.generator.setDymoFeature(currentDymo, k, info.scoreValues[k]));
        _.keys(info.perfValues).forEach(k => this.generator.setDymoFeature(currentDymo, k, info.perfValues[k]));
        this.generator.setDymoParameter(currentDymo, uris.ONSET, info.perfValues[PERF_ONSET]);
      });
    this.generator.getManager().getStore().updatePartOrder(perfDymo, PERF_ONSET);
    return perfDymo;
  }

  private parseValue(inputString: string, parseInfo: ParseInfo): number {
    let segments = inputString.split("_");
    let valueString = segments[parseInfo.index].substring(parseInfo.prefix);
    let value = Number.parseInt(valueString, 10);
    value = parseInfo.divisor ? value / parseInfo.divisor : value;
    value = !isNaN(parseInfo.min) ? Math.max(parseInfo.min, value) : value;
    return value;
  }

  /*export function createAchBachDymo() {
    var dirPath = 'audio/achachbach10/';
    var fileName = '01-AchGottundHerr';
    var onsetFeature = generator.getFeature(uris.ONSET_FEATURE);
    var pitchFeature = generator.getFeature(uris.PITCH_FEATURE);
    var durationFeature = generator.getFeature(uris.DURATION_FEATURE);
    var onsetSFeature = generator.getFeature("onsetS");
    var durationSFeature = generator.getFeature("durationS");
    var timeFeature = generator.getFeature("time");
    var topDymo = generator.addDymo();
    generator.setDymoFeature(topDymo, onsetFeature, 0);
    generator.setDymoFeature(topDymo, pitchFeature, 0);
    generator.setDymoFeature(topDymo, durationFeature, 0);
    //setDymoFeature(topDymo, velocityFeature, 0);
    //setDymoFeature(topDymo, onsetSFeature, 0);
    //setDymoFeature(topDymo, durationSFeature, 0);
    var previousOnsets = [];
    $http.get(dirPath + fileName + ".txt").success(function(json) {
      var lines = json.split("\n");
      //split and sort lines
      for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].split("\t");
      }
      lines.sort(function(a, b) { return a[0] - b[0]; });
      //add durations
      var previousOnsets = [];
      for (var i = 0; i < lines.length; i++) {
        var currentOnset = lines[i][0];
        var currentOnsetS = lines[i][1];
        var currentVoice = Number.parseInt(lines[i][3], 10);
        if (previousOnsets[currentVoice]) {
          var previousOnsetIndex = previousOnsets[currentVoice][0];
          var previousDuration = currentOnset - previousOnsets[currentVoice][1];
          var previousDurationS = currentOnsetS - previousOnsets[currentVoice][2];
          lines[previousOnsetIndex][4] = previousDuration;
          lines[previousOnsetIndex][5] = previousDurationS;
        }
        previousOnsets[currentVoice] = [i, currentOnset, currentOnsetS];
      }
      for (var i = lines.length - 4; i < lines.length; i++) {
        lines[i][4] = 2700;
        lines[i][5] = 2700;
      }
      //create dymos
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].length == 6) {
          var values = lines[i];
          var pitch = Number.parseInt(values[2], 10);
          var onset = Number.parseInt(values[0], 10) / 1000;
          var onsetS = Number.parseInt(values[1], 10) / 1000;
          var duration = Number.parseInt(values[4], 10) / 1000;
          var durationS = Number.parseInt(values[5], 10) / 1000;
          var currentDymo;
          if (values[3] == 1) {
            currentDymo = generator.addDymo(topDymo, dirPath + fileName + "-violin.wav");
          } else if (values[3] == 2) {
            currentDymo = generator.addDymo(topDymo, dirPath + fileName + "-clarinet.wav");
          } else if (values[3] == 3) {
            currentDymo = generator.addDymo(topDymo, dirPath + fileName + "-saxphone.wav");
          } else if (values[3] == 4) {
            currentDymo = generator.addDymo(topDymo, dirPath + fileName + "-bassoon.wav");
          }
          generator.setDymoFeature(currentDymo, pitchFeature, pitch);
          generator.setDymoFeature(currentDymo, timeFeature, onset);
          generator.setDymoFeature(currentDymo, onsetFeature, onset);
          generator.setDymoFeature(currentDymo, durationFeature, duration);
          generator.setDymoFeature(currentDymo, onsetSFeature, onsetS);
          generator.setDymoFeature(currentDymo, durationSFeature, durationS);
          currentDymo.getParameter(uris.ONSET).update(onset); //so that it can immediately be played back..
        }
      }
      //GlobalVars.DYMO_STORE.updatePartOrder(topDymo, onsetFeature.name);
    });

    $http.get('getsourcefilesindir/', { params: { directory: dirPath } }).success(function(data) {
      var allFilenames = data;
      allFilenames = allFilenames.filter(function(f) { return f.indexOf("wav") >= 0; });
      for (var i = 0; i < allFilenames.length; i++) {
        //scheduler.addSourceFile(dirPath+allFilenames[i]);
      }
    });
  }*/

}