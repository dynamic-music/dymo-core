/**
 * A DymoWriter will write dymos to json or rdf.
 * @constructor
 */
function DymoWriter(store, $http) {
	
	this.writeToJsonld = function(path, name) {
		if (!name) {
			name = 'dymo.json'
		}
		store.toJsonld(function(json) {
			httpPost(path+name, json);
		});
	}
	
	function httpPost(uri, content) {
		var xhr = new XMLHttpRequest();
		xhr.send(content);
		xhr.addEventListener("save", function() {
			console.log("saved " + uri);
		});
		xhr.addEventListener("error", function() {
			console.log("saving " + uri + " failed");
		});
		xhr.open("POST", uri);
		xhr.send();
	}
	
}