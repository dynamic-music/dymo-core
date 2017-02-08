import * as math from 'mathjs'
import * as _ from 'lodash'
import * as clusterfck from 'clusterfck'
import { indicesOfNMax } from '../util/arrays'

/** maps over arrays of values */
export interface ArrayMap {
	(values: (number|number[])[]): (number|number[])[];
}

/** returns a function that rounds all numbers in an array to the given precision */
export function getRound(precision: number): ArrayMap {
	return toArrayMap(_.curryRight(_.round,2)(precision));
}

/** returns a function that maps all numbers in an array onto their index */
export function getOrder(): ArrayMap {
	return (values: number[]) => values.map((v,i) => i);
}

/** returns a function that maps all arrays in an array onto the outDims highest values */
export function getSummarize(outDims: number): ArrayMap {
	return toMatrixMap(_.curryRight(indicesOfNMax)(outDims));
}

export function getToPitchClassSet(outDims: number): ArrayMap {
	return _.flow(getSummarize(outDims), sort);
}

//TODO IS NOT REALLY SET CLASS YET, NEED TO INVERT POTENTIALLY!!
export function getToSetClass(outDims: number): ArrayMap {
	return _.flow(getSummarize(outDims), sort, toMatrixMap(toIntervals));
}

/** returns a function that maps all numbers in an array onto a discrete segment [0,...,numValues-1] */
export function getDiscretize(numValues: number): ArrayMap {
	return _.flow(scale, _.curryRight(multiply)(numValues), toArrayMap(_.round));
}

export function getCluster(numClusters: number): ArrayMap {
	return _.curryRight(cluster)(numClusters);
}

/** scales all values in an array to [0,1] */
export function scale(values: number[]): number[] {
	var max = _.max(values);
	var min = _.min(values);
	return values.map(v => (v-min)/(max-min));
}

/** normalizes all values in an array */
export function normalize(values: number[]): number[] {
	var mean = _.mean(values);
	var std = Math.sqrt(_.sum(values.map(v => Math.pow((v - mean), 2))) / values.length);
	return values.map(v => (v-mean)/std);
}

/** maps all values onto the interval by which they are reached */
export function toIntervals(values: number[]): number[] {
	return values.map((v,i) => i>0 ? v-values[i-1] : 0);
}

/** clusters all values and maps them onto their cluster index */
function cluster(values: number[][], clusterCount: number): number[] {
	var kmeans = new clusterfck.Kmeans(null);
	var clusters = kmeans.cluster(values, clusterCount, null, null, null);
	return values.map(v => kmeans.classify(v, null));
}

function multiply(values: number[], multiplier: number): number[] {
	return values.map(v => v*multiplier);
}

function sort(values: number[][]): number[][] {
	return values.map(v => _.sortBy(v));
}

function toArrayMap(func: (x:number)=>number): ArrayMap {
	return (values: number[]) => values.map(v => func(v));
}

function toMatrixMap(func: (x:number[])=>number[]): ArrayMap {
	return (values: number[][]) => values.map(v => func(v));
}

export class Quantizer {

	private dimFuncs: ArrayMap[];

	constructor(dimFuncs: ArrayMap[]) {
		this.dimFuncs = dimFuncs;
	}

	getQuantizedPoints(points: (number|number[])[][]): number[][] {
		points = this.dimFuncs.map((f,i) => f(points.map(p => p[i])));
		points = _.zip(...points);
		return points.map(p => _.flatten(p));
	}

	roundPoint(point, precision) {
		return point.map(x => _.round(x, precision));
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