import 'isomorphic-fetch';
import * as _ from 'lodash';
import { Scheduler } from '../../src/audio/scheduler';
import { DymoStore } from '../../src/io/dymostore';
import { DymoLoader } from '../../src/io/dymoloader';
import * as u from '../../src/globals/uris';
import { SERVER_ROOT } from './server';

describe("a dymoloader", function() {

	//window.AudioContext = window.AudioContext || window.webkitAudioContext;
	//var audioContext = new AudioContext();

	var loader: DymoLoader, store: DymoStore;
	var dymo, dymoMap, scheduler, rendering, manager;
	var filespath = SERVER_ROOT+'spec/files/';
	var dymoPath = filespath+'dymo.json';
	var fixdymoPath = filespath+'fixdymo.json'
	var dymo2Path = filespath+'dymo2.json';
	var dymo3Path = filespath+'dymo3.json';
	var mixDymoPath = filespath+'mixdymo.json';
	var controlRenderingPath = filespath+'control-rendering.json';
	//var reverbPath = '../audio/impulse_rev.wav';
	var fadePosition;
	var isPlaying;

	beforeEach(function(done) {
		store = new DymoStore();
		store.loadOntologies(SERVER_ROOT+'ontologies/')
			.then(() => {
				loader = new DymoLoader(store);
				scheduler = new Scheduler(null, store);
				fadePosition = 0;
				isPlaying = false;
				done();
			})
	});

	it("loads a dymo from json", function(done) {
		loader.loadFromFiles(dymoPath).then(loadedStuff => {
			var topDymoUri = loadedStuff.dymoUris[0];
			scheduler.init(null, topDymoUri);
			//dymoMap = loadedDymo[1];
			expect(topDymoUri).toEqual(u.CONTEXT_URI+"dymo0");
			//test if initial parameter value loaded correctly
			expect(store.findParameterValue(u.CONTEXT_URI+"dymo4", u.AMPLITUDE)).toEqual(0.5);
			expect(store.findParameterValue(u.CONTEXT_URI+"dymo76", u.AMPLITUDE)).toBeUndefined();
			//expect(dymoMap[CONTEXT_URI+"dymo76"].getParameter(AMPLITUDE).getValue()).toEqual(1);
			expect(store.findParts(topDymoUri).length).toBe(330);
			expect(store.findAllObjectsInHierarchy(topDymoUri).length).toBe(331);
			//expect(Object.keys(dymoMap).length).toBe(331);
			done();
		});
	});

	it("loads higher-level parameters from json", function(done) {
		loader.loadFromFiles(mixDymoPath).then(loadedStuff => {
			var topDymoUri2 = loadedStuff.dymoUris[0];
			expect(topDymoUri2).toEqual(u.CONTEXT_URI+"mixdymo");
			expect(store.findParts(u.CONTEXT_URI+"mixdymo").length).toBe(2);
			expect(store.findAllObjectsInHierarchy(topDymoUri2).length).toBe(3);
			store.setParameter(u.CONTEXT_URI+"mixdymo", u.CONTEXT_URI+"Fade", 0.7);
			expect(store.findParameterValue(u.CONTEXT_URI+"mixdymo", u.CONTEXT_URI+"Fade")).not.toBeUndefined();
			var parts = store.findParts(u.CONTEXT_URI+"mixdymo");
			expect(store.findParameterValue(parts[0], u.AMPLITUDE)).toBeCloseTo(0.3, 10);
			expect(store.findParameterValue(parts[1], u.AMPLITUDE)).toBe(0.7);
			done();
		});
	});

	it("loads a control rendering from json", function(done) {
		loader.loadFromFiles(dymo2Path, controlRenderingPath).then(loadedStuff => {
			rendering = loadedStuff.rendering;
			var controls = loadedStuff.controls;
			var constraintsObj = loadedStuff.constraints;
			var constraints = _.values(constraintsObj).map(c => c.toString());
			expect(constraints.length).toEqual(3);
			expect(constraints[0]).toEqual('∀ l : http://tiny.cc/mobile-audio-ontology#ListenerOrientation => ∀ o in ["http://tiny.cc/dymo-context/orientation"] => l == 360 * o');
			expect(constraints[1]).toEqual('∀ x : http://tiny.cc/dymo-ontology#Dymo, LevelFeature(x) == 1 => ∀ c in ["http://tiny.cc/dymo-context/slider1"] => Amplitude(x) == c');
			expect(constraints[2]).toEqual('∀ x : http://tiny.cc/dymo-ontology#Dymo, DurationRatio(x) > 0.7 => ∀ c in ["http://tiny.cc/dymo-context/slider1"] => PlaybackRate(x) == c');
			//change parameter and see if selection of dymos adjusts!
			store.setParameter(u.CONTEXT_URI+"dymo1", u.DURATION_RATIO, 0.9);
			expect(store.findParameterValue(null, u.LISTENER_ORIENTATION)).toBeUndefined();
			controls[u.CONTEXT_URI+"orientation"].updateValue(0.5);
			setTimeout(()=>{
				expect(store.findParameterValue(null, u.LISTENER_ORIENTATION)).toBe(180);
				done();
			}, 350);
		});
	});

	/*it("loads same dymo as written", function(done) {
		var comparedDymo = dymo2Path;
		var oReq = new XMLHttpRequest();
		oReq.addEventListener("load", function() {
			var loadedJson = JSON.parse(this.responseText);
			loader.loadDymoFromJson(comparedDymo, function(loadedDymo) {
				//loader.getStore().logData();
				loader.getStore().writeJsonld(function(writtenJson){
					//TODO CHECK WHY JSONLD DOESNT USE SOME TERMS!!!!
					expect(JSON.parse(writtenJson)).toEqual(loadedJson);
					//console.log(JSON.stringify(loadedJson), JSON.stringify(JSON.parse(writtenJson)));
					done();
				});
			});
		});
		oReq.open("GET", comparedDymo);
		oReq.send();
	});*/

	/*it("loads dymos that have parts in other files", function(done) {
		loader.loadFromFiles(dymo3Path).then(loadedStuff => {
			var topDymoUri3 = loadedStuff.dymoUris[0];
			expect(topDymoUri3).toEqual(u.CONTEXT_URI+"dymo");
			var parts = store.findParts(u.CONTEXT_URI+"dymo");
			expect(parts.length).toBe(1);
			expect(store.findParts(parts[0]).length).toBe(3);
			expect(store.findAllObjectsInHierarchy(topDymoUri3).length).toBe(5);
			done();
		});
	});*/

});
