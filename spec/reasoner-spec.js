describe("an easyreasoner", function() {

	it("returns inferred data", function(done) {
		var input = '@prefix : <ppl#>. :John :knows :Paul. :Lisa :knows :John.'
		var rules = '@prefix : <ppl#>. { ?a :knows ?b }=>{ ?b :knows ?a }.'
		new EasyReasoner().queryAll([input, rules], function(results) {
			expect(removeSpaces(results)).toEqual(removeSpaces(
				`PREFIX : <ppl#>
				:John :knows :Paul.
				:Lisa :knows :John.
				:Paul :knows :John.
				:John :knows :Lisa.
				`));
			done();
		});
	});

	it("returns more inferred data", function(done) {
		var input1 = '@prefix ppl: <http://example.org/people#>.\
			@prefix foaf: <http://xmlns.com/foaf/0.1/>.\
			ppl:Cindy foaf:knows ppl:John.\
			ppl:Cindy ppl:dates ppl:John.'
		var input2 = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\
			@prefix ppl: <http://example.org/people#>.\
			@prefix owl: <http://www.w3.org/2002/07/owl#>.\
			foaf:knows a owl:SymmetricProperty.\
			ppl:dates a owl:SymmetricProperty.'
		var rules = '@prefix owl: <http://www.w3.org/2002/07/owl#>.\
			{\
				?predicate a owl:SymmetricProperty.\
				?subject ?predicate ?object.\
			}\
			=>\
			{\
				?object ?predicate ?subject.\
			}.'
		new EasyReasoner().queryAll([input1, input2, rules], function(results) {
			expect(removeSpaces(results)).toEqual(removeSpaces(`PREFIX ppl: <http://example.org/people#>
				PREFIX foaf: <http://xmlns.com/foaf/0.1/>
				PREFIX owl: <http://www.w3.org/2002/07/owl#>

				ppl:Cindy foaf:knows ppl:John.
				ppl:John foaf:knows ppl:Cindy.
				ppl:Cindy ppl:dates ppl:John.
				ppl:John ppl:dates ppl:Cindy.
				foaf:knows a owl:SymmetricProperty.
				ppl:dates a owl:SymmetricProperty.
				`));
			done();
		});
	});

	it("can infer dymos from a composition", function(done) {
		loadFile('files/comp.n3', function(comp) {
			loadFile('../ontologies/comp-rules.n3', function(rules) {
				new EasyReasoner().queryAll([comp, rules], function(result) {
					//console.log(result)
					DYMO_STORE = new DymoStore(function() {
						var loader = new DymoLoader(DYMO_STORE);
						loader.parseDymoFromTurtle(result, function(topDymoUris) {
							expect(DYMO_STORE.findParts(topDymoUris[0]).length).toBe(2);
							expect(Object.keys(loader.getMappings()).length).toBe(1);
							done();
						});
					});
				});
			});
		});
	});


	function removeSpaces(string) {
		return string.replace(/\s/g, '');
	}

});
