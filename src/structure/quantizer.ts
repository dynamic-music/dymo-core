import * as math from 'mathjs'
import * as _ from 'lodash'
import { indicesOfNMax } from '../util/arrays'

export interface Quantization { }

export interface Rounded extends Quantization {
	precision: number
}

export interface Discrete extends Quantization {
	numValues: number
}

export interface Ordering extends Quantization { }

export interface Summary extends Quantization {
	numDims: number
}

export interface Clustered extends Quantization {
	numClusters: number
}

export class Quantizer {

	private dimConfigs: Quantization[];

	constructor(dimConfigs: Quantization[]) {
		this.dimConfigs = dimConfigs;
	}

	//TODO IMPLEMENT ORDER OF SUCCESSION, AND OTHER QUANTIZATIONS

	getQuantizedPoints(points: number[][]): number[][] {
		console.log(this.dimConfigs);
		this.dimConfigs.map((dim,i) => {
			if ((dim as Rounded).precision) {
				this.roundDim(points, i, (dim as Rounded).precision);
			} else if ((dim as Discrete).numValues) {
				this.discretizeDim(points, i, (dim as Discrete).numValues);
			} else if ((dim as Summary).numDims) {
				this.summarizeDim(points, i, (dim as Summary).numDims);
			} else if ((dim as Clustered).numClusters) {
				//TODO!!
			} else {
				this.orderizeDim(points, i);
			}
		});

		return points.map(p => _.flatten(p));
	}

	roundPoint(point, precision) {
		return point.map(x => _.round(x, precision));
	}

	private roundDim(points, index, precision) {
		this.mapDim(points, index, _.curryRight(this.round)(precision));
	}

	private discretizeDim(points, index, numValues) {
		this.normalizeDim(points, index);
		this.mapDim(points, index, (x) => Math.round(x*numValues));
	}

	private normalizeDim(points, index) {
		var max = points.reduce((max,p) => Math.max(max,p[index]), -Infinity);
		var min = points.reduce((max,p) => Math.min(max,p[index]), Infinity);
		this.mapDim(points, index, (x) => (x-min)/(max-min));
	}

	private orderizeDim(points, index) {
		this.mapDimWithIndex(points, index, (x,i) => i);
	}

	private summarizeDim(points, index, outDims: number) {
		//var summaryFunc = func === SUMMARY_FUNCS.MAX ? indices : ;
		this.mapDim(points, index, _.curryRight(indicesOfNMax)(outDims));
	}

	private mapDim(points: number[][], index: number, func: (x:any)=>any): void {
		points.forEach((p,i) => p[index] = func(p[index]));
		//return points.map((p,i) => _.clone(p).splice(i,1,func(p[index],i)));
	}

	private mapDimWithIndex(points: number[][], index: number, func: (x:number, i:number)=>number): void {
		points.forEach((p,i) => p[index] = func(p[index],i));
	}

	//define so it can be curried nicely
	private round(value, precision) {
		return _.round(value, precision);
	}

	/**
	 * TODO WHERE TO PUT?
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