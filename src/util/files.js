function loadFile(path, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', path, true);
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