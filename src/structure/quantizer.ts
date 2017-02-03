import * as math from 'mathjs'
import * as _ from 'lodash'
import { indexOfMax } from '../util/arrays'

export class Quantizer {

  private precision;

  constructor(precision) {
    this.precision = precision;
  }

  //TODO IMPLEMENT ORDER OF SUCCESSION, AND OTHER QUANTIZATIONS

  getQuantizedPoints(points) {
    //normalize some
    //normalizePoints(points);
    points = this.summarizePoints(points);
    //quantize all
    return points.map(p => this.roundPoint(p));
  }

  roundPoint(point) {
    return point.map(x => this.round(x));
  }

  round(value) {
    return _.round(value, this.precision);
  }

  private summarizePoints(points) {
    return points.map((p,i) => [
      indexOfMax(p.slice(0, p.length-2)),
      Math.round(p[p.length-2]),
      i
    ]);
  }

  normalizePoints(points) {
    for (var i = 0; i < points[0].length-2; i++) {
      var max = points.reduce((max,p) => Math.max(max,p[i]), -Infinity);
      var min = points.reduce((max,p) => Math.min(max,p[i]), Infinity);
      points.forEach(p => p[i] = 10*((p[i]-min)/(max-min)));
    }
  }

  /**
	 * returns a map with a normalized vector for each given dymo. if reduce is true, multidimensional ones are reduced
	 */
	normalize(vectors: number[][]): number[][] {
		//normalize the space
		var means = [];
		var vars = [];
		for (var i = 0; i < vectors[0].length; i++) {
			var currentDim = [];
			for (var j = 0; j < vectors.length; j++) {
				if (!isNaN(vectors[j][i])) {
					currentDim.push(vectors[j][i]);
				}
			}
			means[i] = math.mean(currentDim);
			vars[i] = math.var(currentDim);
		}
		return vectors.map(v => v.map((e,i) => (e-means[i])/vars[i]));
	}

}