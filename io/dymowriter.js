function DymoWriter($http) {
	
	var RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
	var dmoRdfUri = "rdf/dmo.n3";
	var mobileRdfUri = "rdf/mobile.n3";
	var charmRdfUri = "rdf/charm.n3";
	var multitrackRdfUri = "http://purl.org/ontology/studio/multitrack";
	var rdfsUri = "http://www.w3.org/2000/01/rdf-schema";
	
	this.writeDymoToJson = function(dymo, path, name) {
		dymo["@context"] = "http://purl.org/ontology/dymo/context.json";
		if (!name) {
			name = 'dymo.json'
		}
		writeJson(dymo, path+name);
	}
	
	this.writeRenderingToJson = function(rendering, path) {
		writeJson(rendering, path+'rendering.json');
	}
	
	function writeJson(json, path) {
		$http.post(path, json).success(function(res) {
			//console.log('success!');
		});
	}
	
	this.writeDmoToRdf = function(uri) {
		var writer = N3.Writer({ prefixes: { 'ch': charmRdfUri+'#' } });
		var writer = N3.Writer({ prefixes: { 'dmo': dmoRdfUri+'#' } });
		var writer = N3.Writer({ prefixes: { 'mb': mbRdfUri+'#' } });
		addDmo(writer);
		writer.end(function (error, result) { console.log(result); });
	}
	
	function addDmo(writer) {
		writer.addTriple('_:',
			RDF_TYPE,
			'dmo:DMO');
		writer.addTriple('_:',
			'ch:hasPart',
			'ch:test2');
	}
	
}