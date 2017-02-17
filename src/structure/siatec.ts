import * as math from 'mathjs'
import * as _ from 'lodash'
import { intersectSortedArrays, mergeSortedArrays, indexOfMax } from '../util/arrays'
import { HEURISTICS } from './heuristics'

export enum OPTIMIZATION {
  NONE,
  MINIMIZE,
  DIVIDE
}

export class Siatec {

  private points;
  private heuristic: HEURISTICS.CosiatecHeuristic;
  private optimizationMethod: number;
  private optimizationDimension: number;
  private vectorTable;
  private patterns;
  private occurrenceVectors;
  private occurrences;
  private heuristics;

  constructor(points: number[][], heuristic: HEURISTICS.CosiatecHeuristic, optimizationMethod: number, optimizationDimension?: number) {
    this.points = points;
    this.heuristic = heuristic;
    this.optimizationMethod = optimizationMethod;
    this.optimizationDimension = optimizationDimension;
    this.run();
  }

  run() {
    this.vectorTable = this.getVectorTable(this.points);
    this.patterns = this.calculateSiaPatterns(this.points);
    //TODO GET OCCURRENCES HERE FOR MINIMIZATION HEURISTICS
    if (this.optimizationMethod === OPTIMIZATION.MINIMIZE) {
      this.patterns = this.patterns.map(p => this.minimizePattern(p, this.points, this.optimizationDimension));
    } else if (this.optimizationMethod === OPTIMIZATION.DIVIDE) {
      this.patterns = _.flatten(this.patterns.map(p => this.dividePattern(p, this.points, this.optimizationDimension)));
    }
    this.occurrenceVectors = this.calculateSiatecOccurrences(this.points, this.patterns);
    this.occurrences = this.occurrenceVectors.map((occ, i) => occ.map(tsl => this.patterns[i].map(p => math.add(p, tsl))));
    this.heuristics = this.patterns.map((p,i) => this.heuristic(p, this.occurrenceVectors[i], this.occurrences[i], this.points));
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

  minimizePattern(pattern: number[][], allPoints: number[][], optimDim: number): number[][] {
    let currentHeuristicValue = this.heuristic(pattern, null, null, allPoints); //TODO SOMEHOW GET OCCURRENCES!!
    pattern.sort((a,b)=>b[optimDim]-a[optimDim]);
    if (pattern.length > 1) {
      //see if minimizable from left
      let leftPatterns = pattern.map((p,i) => pattern.slice(i));
      let left = this.findFirstBetterSubPattern(leftPatterns, allPoints, currentHeuristicValue);
      //see if minimizable from right
      let rightPatterns = pattern.map((p,i) => pattern.slice(0,i+1)).reverse();
      let right = this.findFirstBetterSubPattern(rightPatterns, allPoints, currentHeuristicValue);

      let betterPattern;
      if (left[0] > -1 && right[0] > -1) {
        if (left[0] == right[0]) { //take pattern with better heuristic value
          betterPattern = left[1] >= right[1] ? leftPatterns[left[0]] : rightPatterns[right[0]];
        } else { //take pattern that keeps more elements
          betterPattern = left[0] <= right[0] ? leftPatterns[left[0]] : rightPatterns[right[0]];
        }
      } else if (left[0] > -1) { //only left worked
        betterPattern = leftPatterns[left[0]];
      } else if (right[0] > -1) { //only right worked
        betterPattern = rightPatterns[right[0]];
      }
      if (betterPattern) {
        return this.minimizePattern(betterPattern, allPoints, optimDim);
      }
    }
    return pattern;
  }

  dividePattern(pattern: number[][], allPoints: number[][], optimDim: number): number[][][] {
    let currentHeuristicValue = this.heuristic(pattern, null, null, allPoints);//TODO SOMEHOW GET OCCURRENCES!!
    pattern.sort((a,b)=>b[optimDim]-a[optimDim]);
    if (pattern.length > 1) {
      let leftPatterns = this.getLeftPatterns(pattern);
      let leftHeuristics = this.getAllHeuristics(leftPatterns, allPoints);
      let rightPatterns = this.getRightPatterns(pattern).reverse();
      let rightHeuristics = this.getAllHeuristics(rightPatterns, allPoints);
      let productHeuristics = leftHeuristics.map((h,i) => h * rightHeuristics[i]);
      let indexOfBest = indexOfMax(productHeuristics);
      if (leftPatterns.length > 11) {
        console.log(leftPatterns.length, currentHeuristicValue, productHeuristics, indexOfBest, leftHeuristics[indexOfBest], rightHeuristics[indexOfBest]);
      }
      if (Math.max(leftHeuristics[indexOfBest], rightHeuristics[indexOfBest]) > currentHeuristicValue) {
        let leftPattern = pattern.slice(indexOfBest);
        let rightPattern = pattern.slice(0, indexOfBest);
        return _.flatten([this.dividePattern(leftPattern, allPoints, optimDim), this.dividePattern(rightPattern, allPoints, optimDim)]);
      }
    }
    return [pattern];
  }

  private getLeftPatterns(pattern) {
    return pattern.map((p,i) => pattern.slice(i));
  }

  private getRightPatterns(pattern) {
    return pattern.map((p,i) => pattern.slice(0,i+1)).reverse();
  }

  private getAllHeuristics(patterns, allPoints) {
    return patterns.map(s => this.heuristic(s, null, null, allPoints)); //TODO SOMEHOW GET OCCURRENCES!!
  }

  private findFirstBetterSubPattern(subPatterns, allPoints, currentHeuristicValue: number) {
    let potentialHeuristics = this.getAllHeuristics(subPatterns, allPoints);
    var firstBetterIndex = potentialHeuristics.findIndex(c => c > currentHeuristicValue);
    if (subPatterns.length > 14) {
      console.log(subPatterns.length, currentHeuristicValue, potentialHeuristics, firstBetterIndex);
    }
    return [firstBetterIndex, potentialHeuristics[firstBetterIndex]];
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