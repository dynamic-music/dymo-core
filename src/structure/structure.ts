import * as _ from 'lodash'
import * as math from 'mathjs'
import { Quantizer } from './quantizer'
import { Cosiatec } from './cosiatec'
import { SmithWaterman } from './smith-waterman'

export class StructureInducer {

  private quantizer: Quantizer;
  private cosiatec: Cosiatec;
  private quantizedPoints: number[][];
  private pointStrings: string[];

  constructor(points: number[][], options) {
    var quantizerFuncs = options ? options.quantizerFunctions : [];
    this.quantizer = new Quantizer(quantizerFuncs);
    this.quantizedPoints = this.quantizer.getQuantizedPoints(points);
    console.log("quantized points:", JSON.stringify(this.quantizedPoints));
    this.pointStrings = this.quantizedPoints.map(v => JSON.stringify(v));
    this.cosiatec = new Cosiatec(this.quantizedPoints, options);
  }

  //returns patterns of indices in the original point sequence
  getOccurrences(patternIndices) {
    let occurrences = this.cosiatec.getOccurrences(patternIndices);
    //get the indices of the points involved
    return this.pointsToIndices(occurrences);
  }

  getSmithWaterman() {
    let points = this.quantizedPoints.map(p => p.slice(0,3));
    return new SmithWaterman().run(points, points);
  }

  getStructure(minPatternLength = 12) {
    let vectors = this.cosiatec.getOccurrenceVectors();
    let occurrences = this.cosiatec.getOccurrences();
    //only take patterns that are significantly large
    vectors = vectors.filter((vec,i) => occurrences[i][0].length > minPatternLength);
    occurrences = occurrences.filter(occ => occ[0].length > minPatternLength);
    let patternSpans = occurrences.map(occ => this.getPatternSpan(occ[0]));
    //sort in ascending order by norm of translation vector
    let avgTsls = vectors.map(vs => math.mean(vs.map(v => Math.sqrt(math.sum(v.map(p => Math.pow(p,2)))))));
    [avgTsls, occurrences] = this.sortArraysByFirst(true, avgTsls, occurrences);
    //map onto point indices
    let occurrenceIndices = this.pointsToIndices(occurrences);
    //start with list of indices
    let structure = this.pointStrings.map((p,i) => i);
    let paths = _.clone(structure).map(i => [i]);
    //[[0,1],[2,3,4],5,[6,[7,8]]]
    occurrenceIndices.forEach((occs,i) => {
      //take transposed if tsl < span/2
      if (avgTsls[i] < patternSpans[i]/2) {
        occs = _.zip(...occs);
      }
      //sort
      let minIndices = occs.map(occ => _.min(occ));
      let maxIndices = occs.map(occ => _.max(occ));
      [minIndices, maxIndices, occs] = this.sortArraysByFirst(true, minIndices, maxIndices, occs);
      //eliminate overlaps
      occs.forEach((occ,j) => {
        if (j+1 < occs.length) {
          if (maxIndices[j] >= minIndices[j+1]) {
            maxIndices[j] = minIndices[j+1]-1;
          }
        } else {
          //adjust last segment to be of same length as previous one
          maxIndices[j] = minIndices[j]+(maxIndices[j-1]-minIndices[j-1]);
        }
      });
      //see if all segments can be built
      let allSegmentsPossible = occs.every((occ,j) =>
        _.isEqual(_.initial(paths[minIndices[j]]), _.initial(paths[maxIndices[j]])));
      //start building
      if (allSegmentsPossible) {
        console.log(JSON.stringify(_.zip(minIndices, maxIndices)));
        //iteratively build structure
        occs.forEach((occ,j) => {
          let minIndex = minIndices[j];
          let maxIndex = maxIndices[j];
          if (_.isEqual(_.initial(paths[minIndex]), _.initial(paths[maxIndex]))) {
            let parentPath = _.initial(paths[minIndex]);
            let parentSegment = this.getSegmentAtPath(structure, parentPath);
            let firstIndex = _.last(paths[minIndex]);
            let lastIndex = _.last(paths[maxIndex]);
            let elementIndices = _.range(firstIndex, lastIndex+1);
            let newSegment = elementIndices.map(e => parentSegment[e]);
            parentSegment.splice(firstIndex, lastIndex-firstIndex+1, newSegment);
            //update paths!
            _.range(minIndex, maxIndex+1).forEach(i => {
              paths[i] = parentPath.concat(firstIndex).concat(paths[i][parentPath.length]-firstIndex).concat(paths[i].slice(parentPath.length+1))
            });
            _.range(maxIndex+1, paths.length).forEach(i => {
              if (_.isEqual(paths[i].slice(0, parentPath.length), parentPath)) {
                paths[i][parentPath.length] -= newSegment.length-1
              }
            });
          }
          //console.log(JSON.stringify(paths))
        });
      }
    });
    console.log(JSON.stringify(structure));
    return structure;
  }

  private sortArraysByFirst(ascending: boolean, ref: number[], ...arrays: any[][])  {
    let zipped = _.zip(ref, ...arrays);
    zipped.sort((a,b) => ascending ? a[0] - b[0] : b[0] - a[0]);
    return _.unzip(zipped);
  }

  private getSegmentAtPath(structure, path: number[]) {
    path.forEach(i => structure = structure[i]);
    return structure;
  }

  private getPatternSpan(pattern: number[][]): number {
    return <number> math.norm(math.subtract(pattern[pattern.length-1], pattern[0]));
  }

  private pointsToIndices(occurrences: number[][][][]): number[][][] {
    return occurrences.map(occ => occ.map(pat => pat.map(p => this.getPointIndex(p))));
  }

  private getPointIndex(point: number[]): number {
    //quantize again to get rid of float errors!
    return this.pointStrings.indexOf(JSON.stringify(this.quantizer.roundPoint(point, 8)));
  }

}