import * as _ from 'lodash'
import { Siatec } from './siatec'
import { indexOfMax, compareArrays } from '../util/arrays'

export class Cosiatec {

  private points;
  private heuristic;
  private minimize;
  private patterns;
  private occurrences;

  constructor(points: number[][], heuristic: Function, overlapping: boolean, minimize = false) {
    this.points = this.getSortedCloneWithoutDupes(points);
    this.heuristic = heuristic;
    this.minimize = minimize;
    this.patterns = [];
    this.occurrences = [];
    if (overlapping) {
      this.calculateOverlappingCosiatecPatterns();
    } else {
      this.calculateCosiatecPatterns();
    }
    console.log(JSON.stringify(this.patterns.map((p,i) => [p.length, this.occurrences[i].length])));
  }

  getPatterns(patternIndices?: number[]) {
    if (patternIndices != null) {
      return this.patterns.filter((p,i) => patternIndices.indexOf(i) >= 0);
    }
    return this.patterns;
  }

  getOccurrences(patternIndices?: number[]) {
    if (patternIndices != null) {
      return this.occurrences.filter((p,i) => patternIndices.indexOf(i) >= 0);
    }
    return this.occurrences;
  }

  //returns an array of pairs of patterns along with their transpositions
  //jamie's cosiatec: performs sia only once, returns the best patterns necessary to cover all points
  private calculateOverlappingCosiatecPatterns() {
    var currentPoints = this.points;
    var siatec = new Siatec(currentPoints, this.heuristic, this.minimize);
    var patterns = siatec.getPatterns();
    var occurrences = siatec.getOccurrences();
    var heuristics = siatec.getHeuristics();
    console.log(currentPoints.length, patterns.length);
    while (currentPoints.length > 0 && patterns.length > 0) {
      var iOfMaxHeur = indexOfMax(heuristics);
      var involvedPoints = new Set(_.flatten(occurrences[iOfMaxHeur]).map(p => JSON.stringify(p)));
      var previousSize = currentPoints.length;
      currentPoints = currentPoints.map(p => JSON.stringify(p)).filter(p => !involvedPoints.has(p)).map(p => JSON.parse(p));
      //only add to results if the pattern includes some points that are in no other pattern
      if (previousSize > currentPoints.length) {
        console.log(currentPoints.length, patterns.length);
        this.patterns.push(patterns[iOfMaxHeur]);
        this.occurrences.push(occurrences[iOfMaxHeur]);
      }
      patterns.splice(iOfMaxHeur, 1);
      occurrences.splice(iOfMaxHeur, 1);
      heuristics.splice(iOfMaxHeur, 1);
    }
  }

  //returns an array of pairs of patterns along with their transpositions
  //original cosiatec: performs sia iteratively on remaining points, returns the best patterns of each step
  private calculateCosiatecPatterns() {
    var currentPoints = this.points;
    while (currentPoints.length > 0) {
      var siatec = new Siatec(currentPoints, this.heuristic, this.minimize);
      var patterns = siatec.getPatterns();
      var occurrences = siatec.getOccurrences();
      var heuristics = siatec.getHeuristics();
      console.log(currentPoints.length, patterns.length);
      if (patterns.length > 0) {
        var iOfMaxHeur = heuristics.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        this.patterns.push(patterns[iOfMaxHeur]);
        this.occurrences.push(occurrences[iOfMaxHeur]);
        var involvedPoints = new Set(_.flatten(occurrences[iOfMaxHeur]).map(p => JSON.stringify(p)));
        currentPoints = currentPoints.map(v => JSON.stringify(v)).filter(v => !involvedPoints.has(v)).map(v => JSON.parse(v));
      } else {
        break;
      }
    }
  }

  private getSortedCloneWithoutDupes(array) {
    var clone = _.uniq(array);
    clone.sort(compareArrays);
    return clone;
  }

}