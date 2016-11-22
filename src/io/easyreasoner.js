/**
 * A reasoner that uses the EYE server
 * @constructor
 */
function EasyReasoner() {

	var self = this;

	var eyePath = 'http://eye.restdesc.org/';
	var queryAll = '{ ?a ?b ?c. } => { ?a ?b ?c. }.';

	this.queryAll = function(files, callback) {
		var data = '';
		for (var i = 0; i < files.length; i++) {
			data += encodeURIComponent('data=' + files[i]) + '&';
		}
		data += encodeURIComponent('query=' + queryAll);
		console.log(files, data);
		postRequest(eyePath, data, function(results) {
			callback(results);
		});
	}

	function postRequest(path, data, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', path);
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		/** @this {Object} */
		xhr.onload = function() {
			callback(xhr.responseText);
		};
		xhr.error = function(e){
			console.log(e);
		};
		xhr.send(data);
	}

}
