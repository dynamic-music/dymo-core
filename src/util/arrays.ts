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
