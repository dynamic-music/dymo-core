import * as math from 'mathjs'
import * as _ from 'lodash'
import { indicesOfNMax } from '../util/arrays'

export interface QuantDimFunction {
	(values: number[]): number[];
}

export function getRound(precision: number): QuantDimFunction {
	return makeDimFunction(_.curryRight(round)(precision));
}

export function getDiscretize(numValues: number): QuantDimFunction {
	return makeDimFunction(_.curryRight(discretize)(numValues));
}

export function getOrder(): QuantDimFunction {
	return makeIndexDimFunction((x,i) => i);
}

export function getSummarize(outDims: number): QuantDimFunction {
	return makeDimFunction(_.curryRight(indicesOfNMax)(outDims));
}

export function getNormalize(): QuantDimFunction {
	return normalize;
}

function normalize(values: number[]): number[] {
	var max = _.max(values);
	var min = _.min(values);
	return values.map(v => (v-min)/(max-min));
}

function discretize(values: number[], numValues: number): number[] {
	values = normalize(values);
	return values.map(x => _.round(x*numValues))
}

function makeDimFunction(func: (x:any)=>any): QuantDimFunction {
	return function(values: number[]): number[] {
		return values.map(v => func(v));
	}
}

function makeIndexDimFunction(func: (x:any,i:number)=>any): QuantDimFunction {
	return function(values: number[]): number[] {
		return values.map((v,i) => func(v,i));
	}
}

//define so it can be curried nicely
function round(value, precision) {
	return _.round(value, precision);
}

export class Quantizer {

	private dimFuncs: QuantDimFunction[];

	constructor(dimFuncs: QuantDimFunction[]) {
		this.dimFuncs = dimFuncs;
	}

	getQuantizedPoints(points: number[][]): number[][] {
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