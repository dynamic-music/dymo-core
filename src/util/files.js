function loadFile(path, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', path, true);
	/** @this {Object} */
	request.onload = function() {
		callback(this.responseText);
	};
	request.error = function(e){
		console.log(e);
	};
	request.send();
}

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