import 'isomorphic-fetch';
import { Scheduler } from '../../src/audio/scheduler';
import { DymoStore } from '../../src/io/dymostore';
import { DymoLoader } from '../../src/io/dymoloader';
import { GlobalVars } from '../../src/globals/globals';
import { CONTEXT_URI, AMPLITUDE, DURATION_RATIO, LISTENER_ORIENTATION } from '../../src/globals/uris';
import { SERVER_ROOT } from './server';

describe("a dymoloader", function() {

	//window.AudioContext = window.AudioContext || window.webkitAudioContext;
	//var audioContext = new AudioContext();

	var loader;
	var dymo, dymoMap, scheduler, rendering, manager;
	var filespath = SERVER_ROOT+'spec/files/';
	var dymoPath = filespath+'dymo.json';
	var fixdymoPath = filespath+'fixdymo.json'
	var dymo2Path = filespath+'dymo2.json';
	var dymo3Path = filespath+'dymo3.json';
	var mixDymoPath = filespath+'mixdymo.json';
	var featureRenderingPath = filespath+'feature-rendering.json';
	var controlRenderingPath = filespath+'control-rendering.json';
	//var reverbPath = '../audio/impulse_rev.wav';
	var fadePosition;
	var isPlaying;

	beforeEach(function(done) {
		GlobalVars.DYMO_STORE = new DymoStore();
		GlobalVars.DYMO_STORE.loadOntologies(SERVER_ROOT+'ontologies/')
			.then(() => {
				loader = new DymoLoader(GlobalVars.DYMO_STORE);
				scheduler = new Scheduler(null);
				fadePosition = 0;
				isPlaying = false;
				done();
			})
	});

	it("loads a dymo from json", function(done) {
		loader.loadDymoFromFile(dymoPath).then(loadedDymo => {
			var topDymoUri = loadedDymo[0];
			scheduler.init(null, topDymoUri);
			//dymoMap = loadedDymo[1];
			expect(topDymoUri).toEqual(CONTEXT_URI+"dymo0");
			//test if initial parameter value loaded correctly
			expect(GlobalVars.DYMO_STORE.findParameterValue(CONTEXT_URI+"dymo4", AMPLITUDE)).toEqual(0.5);
			expect(GlobalVars.DYMO_STORE.findParameterValue(CONTEXT_URI+"dymo76", AMPLITUDE)).toBeUndefined();
			//expect(dymoMap[CONTEXT_URI+"dymo76"].getParameter(AMPLITUDE).getValue()).toEqual(1);
			expect(GlobalVars.DYMO_STORE.findParts(topDymoUri).length).toBe(330);
			expect(GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(topDymoUri).length).toBe(331);
			//expect(Object.keys(dymoMap).length).toBe(331);
			done();
		});
	});

	it("loads higher-level parameters from json", function(done) {
		loader.loadDymoFromFile(mixDymoPath).then(loadedDymo => {
			var topDymoUri2 = loadedDymo[0];
			expect(topDymoUri2).toEqual(CONTEXT_URI+"mixdymo");
			expect(GlobalVars.DYMO_STORE.findParts(CONTEXT_URI+"mixdymo").length).toBe(2);
			expect(GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(topDymoUri2).length).toBe(9);
			//expect(GlobalVars.DYMO_STORE.findParameterValue(CONTEXT_URI+"mixdymo", CONTEXT_URI+"Fade")).not.toBeUndefined();
			//expect(dymo2.getParameter(CONTEXT_URI+"Fade").getObservers().length).toBe(1);
			GlobalVars.DYMO_STORE.setParameter(CONTEXT_URI+"mixdymo", CONTEXT_URI+"Fade", 0.7);
			var parts = GlobalVars.DYMO_STORE.findParts(CONTEXT_URI+"mixdymo");
			expect(GlobalVars.DYMO_STORE.findParameterValue(parts[0], AMPLITUDE)).toBeCloseTo(0.3, 10);
			expect(GlobalVars.DYMO_STORE.findParameterValue(parts[1], AMPLITUDE)).toBe(0.7);
			done();
		});
	});

	it("loads a control rendering from json", function(done) {
		loader.loadDymoFromFile(dymo2Path).then(loadedDymo => {
			loader.loadRenderingFromFile(controlRenderingPath).then(loadedRendering => {
				rendering = loadedRendering[0];
				var controls = loadedRendering[1];
				var mappingsObj = loader.getMappings();
				var mappings = Object.keys(mappingsObj).map(k => mappingsObj[k]);
				expect(mappings.length).toEqual(3);
				expect(mappings[0].getTargets().length).toEqual(1);
				expect(mappings[1].getTargets()).toBeUndefined();
				expect(mappings[2].getTargets().length).toEqual(3);
				//change feature and see if selection of dymos adjusts!
				GlobalVars.DYMO_STORE.setParameter(CONTEXT_URI+"dymo1", DURATION_RATIO, 0.9);
				expect(mappings[0].getTargets().length).toEqual(2);
				expect(Object.keys(controls).length).toEqual(3);
				expect(GlobalVars.DYMO_STORE.findParameterValue(null, LISTENER_ORIENTATION)).toBeUndefined();
				controls[CONTEXT_URI+"orientation"].updateValue(0.5);
				expect(GlobalVars.DYMO_STORE.findParameterValue(null, LISTENER_ORIENTATION)).toBe(180);
				done();
			});
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

	it("loads dymos that have parts in other files", function(done) {
		loader.loadDymoFromFile(dymo3Path).then(loadedDymo => {
			var topDymoUri3 = loadedDymo[0];
			expect(topDymoUri3).toEqual(CONTEXT_URI+"dymo");
			var parts = GlobalVars.DYMO_STORE.findParts(CONTEXT_URI+"dymo");
			expect(parts.length).toBe(1);
			expect(GlobalVars.DYMO_STORE.findParts(parts[0]).length).toBe(3);
			expect(GlobalVars.DYMO_STORE.findAllObjectsInHierarchy(topDymoUri3).length).toBe(5);
			done();
		});
	});

});
