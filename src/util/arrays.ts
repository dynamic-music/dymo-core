import * as _ from 'lodash'
import { BinaryHeap } from './heap'

export function flattenArray(array) {
	return array.reduce(function (flat, toFlatten) {
		return flat.concat(Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
	}, []);
}

export function flattenArrayOnce(array) {
	return [].concat.apply([], array);
}

export function intersectArrays(a, b) {
	if (a && b) {
		var t;
		if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
		return a.filter(function (e) {
			if (b.indexOf(e) !== -1) return true;
		});
	}
	return [];
}

//takes two sorted arrays of arrays and returns their intersection
export function intersectSortedArrays(a, b) {
	var isect = [];
	var i = 0, j = 0, ii = a.length, jj = b.length;
	while (i < ii && j < jj) {
		var c = compareArrays(a[i], b[j]);
		if (c == 0) isect.push(a[i]);
		if (c <= 0) i++;
		if (c >= 0) j++;
	}
	return isect;
}

//takes two sorted arrays of arrays and returns their union
export function uniteSortedArrays(a, b) {
	var union = [];
	var i = 0, j = 0, ii = a.length, jj = b.length;
	while (i < ii && j < jj) {
		var c = compareArrays(a[i], b[j]);
		if (c <= 0) union.push(a[i++]);
		if (c >= 0) union.push(b[j++]);
	}
	while (i < ii) union.push(a[i++]);
	while (j < jj) union.push(b[j++]);
	return union;
}

//takes k sorted arrays and returns their union
export function mergeSortedArrays(arrays) {
	var union = [];
	var minHeap = new BinaryHeap((a,b) => compareArrays(a[0], b[0]));
	arrays.forEach((a,i) => a.length > 0 ? minHeap.push([a[0], i, 0]) : null); //push [element, array index, element index]
	while (minHeap.size() > 0) {
		var min = minHeap.pop();
		union.push(min[0]);
		var origin = arrays[min[1]];
		var nextIndex = min[2]+1;
		if (nextIndex < origin.length) {
			minHeap.push([origin[nextIndex], min[1], nextIndex]);
		}
	}
	return union;
}

export function indexOfMax(array) {
	return array.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
}

export function indicesOfNMax(array: number[], n: number): number[] {
	array = _.clone(array);
	return _.times(n, () => {
		var i = indexOfMax(array);
		array[i] = -Infinity
		return i;
	});
}

export function removeElementAt(index, array) {
	return array.slice(0,index).concat(array.slice(index+1));
}

export function removeDuplicates(array) {
	//return Array.from(new Set(array));
	//optimized version:
	var seen = {};
	var out = [];
	var len = array.length;
	var j = 0;
	for(var i = 0; i < len; i++) {
			 var item = array[i];
			 if(seen[item] !== 1) {
						 seen[item] = 1;
						 out[j++] = item;
			 }
	}
	return out;
}

//compares two arrays lexicographically
export function compareArrays(a, b) {
	var i = 0, ii = Math.min(a.length, b.length);
	while (i < ii) {
		if (a[i] < b[i]) {
			return -1;
		} else if (a[i] > b[i]) {
			return 1;
		}
		i++;
	}
	return 0;
}
