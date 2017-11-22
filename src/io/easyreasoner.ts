/**
 * A reasoner that uses the EYE server
 * @constructor
 */
export class EasyReasoner {

	private eyePath = 'http://eye.restdesc.org/';
	private QUERY_ALL = '{ ?a ?b ?c. } => { ?a ?b ?c. }.';

	constructor() {}

	queryAll(files): Promise<string> {
		var data = '';
		for (var i = 0; i < files.length; i++) {
			data += encodeURIComponent('data=' + files[i]) + '&';
		}
		data += encodeURIComponent('query=' + this.QUERY_ALL);
		return new Promise(resolve => {
			this.postRequest(this.eyePath, data, results => {
				resolve(results);
			});
		})
	}

	private postRequest(path, data, callback) {
		fetch(path, {
			method: 'POST',
			//headers: { 'Content-Type': 'application/x-www-form-urlencoded' },TODO DOESNT COMPILE
			body: data
		})
		.then(r => r.text())
		.then(r => callback(r))
		.catch(e => console.log(e));
	}

}
