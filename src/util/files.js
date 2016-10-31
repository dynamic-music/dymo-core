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
