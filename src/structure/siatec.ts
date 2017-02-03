import * as math from 'mathjs'
import * as _ from 'lodash'
import { intersectSortedArrays, mergeSortedArrays } from '../util/arrays'

export class Siatec {

  private points;
  private heuristic;
  private minimize;
  private vectorTable;
  private patterns;
  private occurrenceVectors;
  private occurrences;
  private heuristics;

  constructor(points: number[][], heuristic: Function, minimize: boolean) {
    this.points = points;
    this.heuristic = heuristic;
    this.minimize = minimize;
    this.run();
  }

  run() {
    this.vectorTable = this.getVectorTable(this.points);
    this.patterns = this.calculateSiaPatterns(this.points);
    if (this.minimize) {
      this.patterns = this.patterns.map(p => this.minimizePattern(p, this.points));
    }
    this.occurrenceVectors = this.calculateSiatecOccurrences(this.points, this.patterns);
    this.occurrences = this.occurrenceVectors.map((occ, i) => occ.map(tsl => this.patterns[i].map(p => math.add(p, tsl))));
    this.heuristics = this.patterns.map(p => this.heuristic(p, this.points));
  }

  getPatterns() {
    return this.patterns;
  }

  getOccurrenceVectors() {
    return this.occurrenceVectors;
  }

  getOccurrences() {
    return this.occurrences;
  }

  getHeuristics() {
    return this.heuristics;
  }

  //returns a list with the sia patterns detected for the given points
  private calculateSiaPatterns(points: number[][]): number[][] {
    //get all the vectors below the diagonal of the translation matrix
    var halfTable = this.vectorTable.map((col,i) => col.slice(i+1));
    //transform into a list by merging the table's columns
    var vectorList = mergeSortedArrays(halfTable);
    //group by translation vectors
    var patternMap = this.groupByKeys(vectorList);
    //get the map's values
    return Object.keys(patternMap).map(key => patternMap[key]);
  }

  //returns a list with the
  private calculateSiatecOccurrences(points: number[][], patterns: number[][]) {
    var vectorMap = new Map();
    points.forEach((v,i) => vectorMap.set(JSON.stringify(v),i));
    //get rid of points of origin in vector table
    var fullTable = this.vectorTable.map(col => col.map(row => row[0]));
    var occurrences = patterns.map(pat => pat.map(point => fullTable[vectorMap.get(JSON.stringify(point))]));
    occurrences = occurrences.map(occ => this.getIntersection(occ));
    return occurrences;
  }

  minimizePattern(pattern, allPoints) {
    let currentHeuristicValue = this.heuristic(pattern, allPoints);
    pattern.sort((a,b)=>b[2]-a[2])
    if (pattern.length > 1) {
      //see if minimizable from left
      let leftPatterns = pattern.map((p,i) => pattern.slice(i));
      let left = this.findFirstBetterSubPattern(leftPatterns, allPoints, currentHeuristicValue);
      //see if minimizable from right
      let rightPatterns = pattern.map((p,i) => pattern.slice(0,i+1)).reverse();
      let right = this.findFirstBetterSubPattern(rightPatterns, allPoints, currentHeuristicValue);

      let betterPattern;
      if (left[0] == right[0] && left[0] > -1) {
        //take pattern with better heuristic value
        betterPattern = left[1] >= right[1] ? leftPatterns[left[0]] : rightPatterns[right[0]];
      } else if (left[0] < right[0] && left[0] > -1) { //left has smaller index (keeps more elements)
        betterPattern = leftPatterns[left[0]];
      } else if (right[0] > -1) { //right has smaller index
        betterPattern = rightPatterns[right[0]];
      }
      if (betterPattern) {
        return this.minimizePattern(betterPattern, allPoints);
      }
    }
    return pattern;
  }

  private findFirstBetterSubPattern(subPatterns, allPoints, currentHeuristicValue: number) {
    let potentialComps = subPatterns.map(s => this.heuristic(s, allPoints));
    var firstBetterIndex = potentialComps.findIndex(c => c > currentHeuristicValue);
    return [firstBetterIndex, potentialComps[firstBetterIndex]];
  }

  //takes an array of arrays of vectors and calculates their intersection
  private getIntersection(vectors) {
    if (vectors.length > 1) {
      var isect = vectors.slice(1).reduce((isect, tsls) => intersectSortedArrays(isect, tsls), vectors[0]);
      //console.log(JSON.stringify(points), JSON.stringify(isect));
      return isect;
    }
    return vectors[0];
  }

  private getVectorTable(points) {
  	return points.map((v,i) => points.map(w => [math.subtract(w, v), v]));
  }

  private groupByKeys(vectors) {
    return vectors.reduce((grouped, item) => {
      var key = JSON.stringify(item[0]);
      grouped[key] = grouped[key] || [];
      grouped[key].push(item[1]);
      return grouped;
    }, {});
  }

}