import * as math from 'mathjs'
import * as _ from 'lodash'

export const HEURISTICS = {
	COVERAGE: getCoverage,
	COMPACTNESS: getCompactness,
	COMPACTNESS2: getFlompactness
}

export function getCoverage(occurrences, numTotalPoints: number) {
  return occurrences.map(occ => new Set(_.flatten(occ).map(p => JSON.stringify(p))).size / numTotalPoints);
}

export function getCompactness(pattern: number[][], allPoints: number[][]) {
  //console.log(patterns[0].length, getPointsInBoundingBox(patterns[0], allPoints).length)
  return 1 / getPointsInBoundingBox(pattern, allPoints).length;
}

export function getFlompactness(pattern: number[][], allPoints: number[][]) {
  return 1 / (1 + getPointsInBoundingBox(pattern, allPoints).length - pattern.length);
}

export function getPointsInBoundingBox(pattern, allPoints) {
  var maxes = math.max(pattern, 0);
  var mins = math.min(pattern, 0);
  return allPoints.filter(p => p.every((e,i) => maxes[i] - mins[i] == 0 || (mins[i] <= e && e <= maxes[i])));
}