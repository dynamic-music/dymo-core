import { Quantizer } from './quantizer'
import { Cosiatec } from './cosiatec'
import { getFlompactness } from '../structure/heuristics'

export class StructureInducer {

  private readonly PRECISION = 1;
  private quantizer;
  private cosiatec;
  private pointStrings;

  constructor(points: number[][], heuristic = getFlompactness, overlapping = false) {
    this.quantizer = new Quantizer(this.PRECISION);
    var quantizedPoints = this.quantizer.getQuantizedPoints(points);
    this.pointStrings = quantizedPoints.map(v => JSON.stringify(v));
    this.cosiatec = new Cosiatec(quantizedPoints, heuristic, overlapping);
  }

  //returns patterns of indices in the original point sequence
  getOccurrences(patternIndices) {
    var occurrences = this.cosiatec.getOccurrences(patternIndices);
    console.log(JSON.stringify(occurrences));
    //get the indices of the points involved
    return occurrences.map(occ => occ.map(pat => pat.map(p => this.getPointIndex(p))));
  }

  private getPointIndex(point) {
    //quantize again to get rid of float errors!
    return this.pointStrings.indexOf(JSON.stringify(this.quantizer.roundPoint(point)));
  }

}