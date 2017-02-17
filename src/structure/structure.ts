import { Quantizer } from './quantizer'
import { Cosiatec } from './cosiatec'

export class StructureInducer {

  private quantizer: Quantizer;
  private cosiatec: Cosiatec;
  private pointStrings;

  constructor(points: number[][], options) {
    this.quantizer = new Quantizer(options.quantizerFunctions);
    var quantizedPoints = this.quantizer.getQuantizedPoints(points);
    console.log("quantized points:", JSON.stringify(quantizedPoints));
    this.pointStrings = quantizedPoints.map(v => JSON.stringify(v));
    this.cosiatec = new Cosiatec(quantizedPoints, options.heuristic, options.overlapping, options.optimizationMethod, options.optimizationDimension);
  }

  //returns patterns of indices in the original point sequence
  getOccurrences(patternIndices) {
    var occurrences = this.cosiatec.getOccurrences(patternIndices);
    //console.log(JSON.stringify(occurrences));
    //get the indices of the points involved
    return occurrences.map(occ => occ.map(pat => pat.map(p => this.getPointIndex(p))));
  }

  private getPointIndex(point) {
    //quantize again to get rid of float errors!
    return this.pointStrings.indexOf(JSON.stringify(this.quantizer.roundPoint(point, 8)));
  }

}