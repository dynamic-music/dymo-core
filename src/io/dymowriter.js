/**
 * A DymoWriter will write dymos to json or rdf.
 * @constructor
 */
function DymoWriter(store, $http) {
	
	this.writeToJsonld = function(path, name) {
		if (!name) {
			name = 'dymo.json'
		}
		this.getJsonld(function(json) {
			httpPost(path+name, json);
		});
	}
	
	this.getJsonld = function(callback) {
		var prefixes = {
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
			"owl": "http://www.w3.org/2002/07/owl#",
			"sch": "http://schema.org/",
			"mo": "http://purl.org/ontology/mo/",
			"mt": "http://purl.org/ontology/studio/multitrack#",
			"ch": "http://tiny.cc/charm-ontology#",
			"dy": "http://tiny.cc/dymo-ontology#",
			"mb": "http://tiny.cc/mobile-audio-ontology#",
		};
		this.getRdf(function(result) {
			result = result.split('_b').join('b'); //rename blank nodes (jsonld.js can't handle the n3.js nomenclature)
			jsonld.fromRDF(result, {format: 'application/nquads'}, function(err, doc) {
				jsonld.frame(doc, {"@id":"http://tiny.cc/dymo-context/dymo0"}, function(err, framed) {
					jsonld.compact(framed, "http://tiny.cc/dymo-context", function(err, compacted) {
						//deal with imperfections of jsonld.js compaction algorithm to make it reeaally nice
						jsonld.compact(compacted, "http://tiny.cc/dymo-context-simple", function(err, compacted) {
							//make it even nicer by removing blank nodes
							removeBlankNodeIds(compacted);
							compacted = JSON.stringify(compacted, null, 2);
							//put the right context back
							compacted = compacted.replace("http://tiny.cc/dymo-context-simple", "http://tiny.cc/dymo-context");
							//console.log(compacted)
							callback(compacted);
						});
					});
				});
			});
		});
	}
	
	this.getRdf = function(callback) {
		var allTriples = store.find(null, null, null);
		var writer = N3.Writer({ format: 'application/nquads' });
		for (var i = 0; i < allTriples.length; i++) {
			writer.addTriple(allTriples[i]);
		}
		writer.end(function (error, result) {
			callback(result);
		});
	}
	
	function removeBlankNodeIds(obj) {
		if (obj && obj instanceof Object) {
			for (var key in obj) {
				if (key == "@id" && obj[key].includes("_:b")) {
					delete obj[key];
				} else {
					removeBlankNodeIds(obj[key]);
				}
			}
		}
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