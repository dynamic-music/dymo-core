import * as _ from 'lodash'
import { Siatec, OPTIMIZATION } from './siatec'
import { HEURISTICS } from './heuristics'
import { indexOfMax, compareArrays } from '../util/arrays'

export class Cosiatec {

  private points;
  private heuristic;
  private optimizationMethod;
  private optimizationDimension;
  private patterns;
  private occurrences;
  private vectors;

  constructor(points: number[][], heuristic = HEURISTICS.COVERAGE, overlapping = false, optimizationMethod = OPTIMIZATION.NONE, optimizationDimension = 0) {
    this.points = this.getSortedCloneWithoutDupes(points);
    this.heuristic = heuristic;
    this.optimizationMethod = optimizationMethod;
    this.optimizationDimension = optimizationDimension;
    console.log(optimizationMethod, optimizationDimension)
    this.patterns = [];
    this.occurrences = [];
    this.vectors = [];
    this.calculateCosiatecPatterns(overlapping);
    //TODO ADJUST PRECISION!!!
    this.vectors = this.vectors.map(i => i.map(v => v.map(e => _.round(e,8))));
    console.log("patterns (length, occurrences, vector): " + JSON.stringify(this.patterns.map((p,i) => [p.length, this.occurrences[i].length, this.vectors[i][1]])));
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

  /**
   * returns an array of pairs of patterns along with their transpositions
   * overlapping false: original cosiatec: performs sia iteratively on remaining points, returns the best patterns of each step
   * overlapping true: jamie's cosiatec: performs sia only once, returns the best patterns necessary to cover all points
   */
  private calculateCosiatecPatterns(overlapping: boolean) {
    var currentPoints = this.points;
    let [patterns, occurrences, vectors, heuristics] = this.getSiatec(currentPoints);
    while (currentPoints.length > 0 && patterns.length > 0) {
      var iOfMaxHeur = indexOfMax(heuristics);
      var involvedPoints = new Set(_.flatten(occurrences[iOfMaxHeur]).map(p => JSON.stringify(p)));
      var previousLength = currentPoints.length;
      currentPoints = currentPoints.map(p => JSON.stringify(p)).filter(p => !involvedPoints.has(p)).map(p => JSON.parse(p));
      //only add to results if the pattern includes some points that are in no other pattern
      if (!overlapping || previousLength > currentPoints.length) {
        console.log("remaining:", currentPoints.length, "patterns:", patterns.length,
          "max pts:", _.max(patterns.map(p=>p.length)), "max occs:", _.max(occurrences.map(o=>o.length)));
        this.patterns.push(patterns[iOfMaxHeur]);
        this.occurrences.push(occurrences[iOfMaxHeur]);
        this.vectors.push(vectors[iOfMaxHeur]);
      }
      if (overlapping) {
        this.removeElementAt(iOfMaxHeur, patterns, occurrences, vectors, heuristics);
      } else {
        [patterns, occurrences, vectors, heuristics] = this.getSiatec(currentPoints);
      }
    }
  }

  private getSiatec(points: number[][]) {
    var siatec = new Siatec(points, this.heuristic, this.optimizationMethod, this.optimizationDimension);
    var patterns = siatec.getPatterns();
    var occurrences = siatec.getOccurrences();
    var vectors = siatec.getOccurrenceVectors();
    var heuristics = siatec.getHeuristics();
    return [patterns, occurrences, vectors, heuristics];
  }

  private removeElementAt(index: number, ...arrays) {
    arrays.forEach(a => a.splice(index, 1));
  }

  private getSortedCloneWithoutDupes(array) {
    var clone = _.uniq(array);
    clone.sort(compareArrays);
    return clone;
  }

}