import 'isomorphic-fetch';
import { DymoStore } from '../../src/io/dymostore';
import { DymoGenerator } from '../../src/generator/dymo-generator';
import { FeatureLoader, Segment, Signal } from '../../src/generator/feature-loader';
import { SERVER_ROOT } from './server';

describe("a dymo generator", function() {

	var loader: FeatureLoader;
	var generator: DymoGenerator;

	beforeEach(function() {
		loader = new FeatureLoader();
		generator = new DymoGenerator(new DymoStore());
	});

	it("loads features from jams", function(done) {
		let topDymo = generator.addDymo();
		loader.loadFeature(SERVER_ROOT+'spec/files/jams-barbeat.json', '1')
			.then(feature => {
				expect(feature.data.length).toEqual(73);
				generator.addSegmentation(feature.data, topDymo);
				expect(generator.getStore().findParts(topDymo).length).toEqual(72);
				expect(generator.getStore().findAllObjectsInHierarchy(topDymo).length).toEqual(73);
			})
			.then(() => loader.loadFeature(SERVER_ROOT+'spec/files/jams-barbeat.json', ''))
			.then(feature => {
				expect(feature.data.length).toEqual(291);
				generator.addSegmentation(feature.data, topDymo);
				let firstBar = generator.getStore().findParts(topDymo)[0];
				expect(generator.getStore().findParts(firstBar).length).toEqual(4);
				expect(generator.getStore().findAllObjectsInHierarchy(topDymo).length).toEqual(363);
			})
			.then(() => loader.loadFeature(SERVER_ROOT+'spec/files/jams-mfcc.json', ''))
			.then(feature => {
				expect(feature.data.length).toEqual(23);
				expect((<Signal>feature.data[0]).value).not.toBeUndefined();
				done();
			})
	});

});
