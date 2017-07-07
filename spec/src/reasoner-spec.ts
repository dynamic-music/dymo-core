import 'isomorphic-fetch';
import { EasyReasoner } from '../../src/io/easyreasoner';
import { DymoStore } from '../../src/io/dymostore';
import { DymoLoader } from '../../src/io/dymoloader';
import { GlobalVars } from '../../src/globals/globals';
import { SERVER_ROOT } from './server';

describe("an easyreasoner", function() {

	it("returns inferred data", function(done) {
		var input = '@prefix : <ppl#>. :John :knows :Paul. :Lisa :knows :John.'
		var rules = '@prefix : <ppl#>. { ?a :knows ?b }=>{ ?b :knows ?a }.'
		new EasyReasoner().queryAll([input, rules])
			.then(results => {
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
		new EasyReasoner().queryAll([input1, input2, rules])
			.then(results => {
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
		let comp, rules, result, loader: DymoLoader;
		fetch(SERVER_ROOT+'spec/files/comp.n3')
		.then(c => c.text())
		.then(c => comp = c)
		.then(() => fetch(SERVER_ROOT+'ontologies/comp-rules.n3'))
		.then(r => r.text())
		.then(r => rules = r)
		.then(() => new EasyReasoner().queryAll([comp, rules]))
		.then(r => result = r)
		.then(() => GlobalVars.DYMO_STORE = new DymoStore())
		.then(() => GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/'))
		.then(() => loader = new DymoLoader(GlobalVars.DYMO_STORE))
		.then(() => loader.parseDymoFromString(result))
		.then(topDymoUris => {
			expect(GlobalVars.DYMO_STORE.findParts(topDymoUris[0]).length).toBe(2);
			expect(Object.keys(loader.getMappings()).length).toBe(1);
			done();
		});
	});

	function removeSpaces(string) {
		return string.replace(/\s/g, '');
	}

});
