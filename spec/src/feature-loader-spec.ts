import 'isomorphic-fetch';
import { FeatureLoader, Segment, Signal } from '../../src/generator/feature-loader';
import { SERVER_ROOT } from './server';

describe("a feature loader", function() {

	var loader: FeatureLoader;

	beforeEach(function() {
		loader = new FeatureLoader();
	});

	it("loads features from jams", function(done) {
		loader.loadFeature(SERVER_ROOT+'spec/files/jams-barbeat.json', '1')
			.then(feature => {
				expect(feature.data.length).toEqual(73);
			})
			.then(() => loader.loadFeature(SERVER_ROOT+'spec/files/jams-barbeat.json', ''))
			.then(feature => {
				expect(feature.data.length).toEqual(291);
			})
			.then(() => loader.loadFeature(SERVER_ROOT+'spec/files/jams-mfcc.json', ''))
			.then(feature => {
				expect(feature.data.length).toEqual(23);
				expect((<Signal>feature.data[0]).value).not.toBeUndefined();
				done();
			})
	});

});
