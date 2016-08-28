/**
 * A graph store based on N3 that offers some nice querying functions.
 * @constructor
 */
function EasyStore() {
	
	var store = N3.Store();
	
	this.loadData = function(data, isJsonld, callback) {
		jsonldToNquads(data, isJsonld, function(nquads) {
			N3.Parser().parse(nquads, function (error, triple, prefixes) {
				//keep streaming triples
				if (triple) {
					store.addTriple(triple);
				//done
				} else if (callback) {
					callback();
				}
			});
		});
	}
	
	function jsonldToNquads(data, isJsonld, callback) {
		if (isJsonld) {
			jsonld.toRDF(data, {format: 'application/nquads'}, function(err, nquads) {
				callback(nquads);
			});
		} else {
			callback(data);
		}
	}
	
	this.logData = function() {
		var rows = store.find(null).map(function(t){return t.subject +"\n" + t.predicate + "\n" + t.object});
		for (var i in rows) {
			console.log(rows[i]);
		}
	}
	
	//calls regular store.find function
	this.find = function(subject, predicate, object) {
		return store.find(subject, predicate, object);
	}
	
	//returns the uri of the object of the first result found in the store
	this.findFirstObjectUri = function(subject, predicate) {
		var results = store.find(subject, predicate, null);
		if (results.length > 0) {
			return results[0].object;
		}
	}
	
	//returns the uri of the subject of the first result found in the store
	this.findFirstSubjectUri = function(predicate, object) {
		var results = store.find(null, predicate, object);
		if (results.length > 0) {
			return results[0].subject;
		}
	}
	
	//returns the value of the first result found in the store
	this.findFirstObjectValue = function(subject, predicate) {
		var object = this.findFirstObjectUri(subject, predicate);
		if (object) {
			var value = N3.Util.getLiteralValue(object);
			var type = N3.Util.getLiteralType(object);
			if (type != "http://www.w3.org/2001/XMLSchema#string") {
				value = Number(value);
			}
			return value;
		}
	}
	
	//returns the objects of all results found in the store
	this.findAllObjectUris = function(subject, predicate) {
		return store.find(subject, predicate, null).map(function(t){return t.object;});
	}
	
	//returns the objects of all results found in the store
	this.findAllObjectValues = function(subject, predicate) {
		return this.findAllObjectUris(subject, predicate).map(function(a){return N3.Util.getLiteralValue(a);});
	}
	
	this.isSubclassOf = function(class1, class2) {
		var superClass = this.findFirstObjectUri(class1, RDFS_URI+"subClassOf");
		while (superClass) {
			//console.log(superClass, class2)
			if (superClass == class2) {
				return true;
			}
			superClass = this.findFirstObjectUri(superClass, RDFS_URI+"subClassOf");
		}
		return false;
	}

}