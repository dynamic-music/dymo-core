function flattenArray(array) {
	return array.reduce(function (flat, toFlatten) {
		return flat.concat(Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
	}, []);
}

function intersectArrays(a, b) {
	if (a && b) {
		var t;
		if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
		return a.filter(function (e) {
			if (b.indexOf(e) !== -1) return true;
		});
	}
	return [];
}

function removeDuplicates(array) {
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
