import 'isomorphic-fetch';
import * as fs from 'fs';
import { DymoGenerator, uris } from '../../src/index';
import { ExpressionGenerator } from '../../src/generator/expression-generator';
import { SERVER_ROOT, SERVER } from './server';

Promise.all([
  createExampleFile('control-rendering.json', generateControlRendering()),
  createExampleFile('similarity-rendering.json', generateSimilarityRendering()),
  createExampleFile('mixdymo.json', createMixDymo()),
  createExampleFile('mixdymo-rendering.json', createMixDymoRendering()),
])
.then(() => console.log('done!'))
.then(() => process.exit());
//generateControlRendering()
  //.then(console.log)
  //.then(j => writeFile(j, '../../../files/test.json'));//control-rendering.json'))

function createExampleFile(name: string, generated: Promise<string>): Promise<any> {
  return generated
    .then(j => j.replace('http://tiny.cc/dymo-context', SERVER_ROOT+'ontologies/dymo-context.json'))
    .then(j => JSON.stringify(JSON.parse(j), null, 2))
    .then(j => writeFile('spec/files/'+name, j));
}

function generateControlRendering(): Promise<string> {
  let dymoGen = new DymoGenerator(SERVER_ROOT+'ontologies/');
  let expressionGen = new ExpressionGenerator(dymoGen.getManager().getStore());
  let renderingUri = dymoGen.addRendering(uris.CONTEXT_URI+"controlRendering", uris.CONTEXT_URI+"dymo0");
  dymoGen.addCustomParameter(uris.LISTENER_ORIENTATION, renderingUri);
  let slider1Uri = dymoGen.addControl("Slider 1", uris.SLIDER, uris.CONTEXT_URI+"slider1");
  let slider2Uri = dymoGen.addControl("Orientation", uris.SLIDER, uris.CONTEXT_URI+"orientation");
  expressionGen.addConstraint(renderingUri, `
    ∀ x : `+uris.DYMO+`, LevelFeature(x) == 1
    => ∀ c in ["`+slider1Uri+`"]
    => Amplitude(x) == c
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ x : `+uris.DYMO+`, DurationRatio(x) > 0.7
    => ∀ c in ["`+slider1Uri+`"]
    => PlaybackRate(x) == c
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ l : `+uris.LISTENER_ORIENTATION+`
    => ∀ o in ["`+slider2Uri+`"]
    => l == 360*o
  `);
  let navVar = expressionGen.addVariable('∀ x : '+uris.DYMO+', LevelFeature(x) == 2');
  dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
  return dymoGen.getManager().getStore().uriToJsonld(renderingUri);
}

function generateSimilarityRendering(): Promise<string> {
  let dymoGen = new DymoGenerator(SERVER_ROOT+'ontologies/');
  let expressionGen = new ExpressionGenerator(dymoGen.getManager().getStore());
  let renderingUri = dymoGen.addRendering(uris.CONTEXT_URI+"similarityRendering", uris.CONTEXT_URI+"similarityDymo");
  let navVar = expressionGen.addVariable('∀ d : '+uris.DYMO+', LevelFeature(d) == 1');
  dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
  return dymoGen.getManager().getStore().uriToJsonld(renderingUri);
}

function createMixDymo() {
  let dymoGen = new DymoGenerator(SERVER_ROOT+'ontologies/');
  let expressionGen = new ExpressionGenerator(dymoGen.getManager().getStore());
  let mixDymoUri = dymoGen.addDymo(null, null, uris.CONJUNCTION, uris.CONTEXT_URI+"mixdymo");
  let fadeParam = dymoGen.addCustomParameter(uris.CONTEXT_URI+"Fade", mixDymoUri);
  let tempoParam = dymoGen.addCustomParameter(uris.CONTEXT_URI+"Tempo", mixDymoUri);
  dymoGen.addDymo(mixDymoUri, null, uris.DISJUNCTION, uris.CONTEXT_URI+"dymo0");
  dymoGen.addDymo(mixDymoUri, null, uris.DISJUNCTION, uris.CONTEXT_URI+"dymo00");
  expressionGen.addConstraint(mixDymoUri, `
    ∀ d : `+uris.DYMO+`, LevelFeature(d) == 1
    => ∀ f in ["`+fadeParam+`"]
    => Amplitude(d) == (1-f)*(1-IndexFeature(d)) + f*IndexFeature(d)
  `);
  expressionGen.addConstraint(mixDymoUri, `
    ∀ d : `+uris.DYMO+`, LevelFeature(d) == 3
    => ∀ t in ["`+tempoParam+`"]
    => TimeStretchRatio(d) == t/60*DurationFeature(d)
  `);
    	/*
      "@id": "dymo0",
    	"@type": "Dymo",
    	"cdt": "Disjunction",
    	"features":[
    		{"@type":"onset","value":0},
    		{"@type":"pitch","value":0}
    	],
    	"parts":{"@list":[
    		{
    			"@id": "dymo1",
    			"@type": "Dymo",
    			"source": "Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p036_ne0001_s000607.wav",
    			"features":[
    				{"@type":"onset","value":0.607},
    				{"@type":"pitch","value":36}
    			],
    			"parameters":[
    				{"@type":"DurationRatio","value":0.607}
    			]
    		},
    		{
    			"@id": "dymo2",
    			"@type": "Dymo",
    			"source": "Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p055_ne0001_s000827.wav",
    			"features":[
    				{"@type":"onset","value":0.827},
    				{"@type":"pitch","value":55}
    			],
    			"parameters":[
    				{"@type":"DurationRatio","value":0.827}
    			]
    		},
    		{
    			"@id": "dymo3",
    			"@type": "Dymo",
    			"source": "Chopin_Op028-01_003_20100611-SMD/Chopin_Op028-01_003_20100611-SMD_p036_ne0001_s000607.wav",
    			"features":[
    				{"@type":"onset","value":0.607}
    			],
    			"parameters":[
    				{"@type":"DurationRatio","value":0.607}
    			]
    		}
    	]}

      "parts":{"@list":["dymo2.json","dymo4.json"]},
    	"similars":[]
    }*/
  return dymoGen.getManager().getStore().uriToJsonld(mixDymoUri);
}

function createMixDymoRendering(): Promise<string> {
  let dymoGen = new DymoGenerator(SERVER_ROOT+'ontologies/');
  let expressionGen = new ExpressionGenerator(dymoGen.getManager().getStore());
  let mixDymoUri = uris.CONTEXT_URI+"mixdymo";
  let fadeRampUri = uris.CONTEXT_URI+"fadeRamp";
  let renderingUri = dymoGen.addRendering(uris.CONTEXT_URI+"mixdymoRendering", uris.CONTEXT_URI+"mixdymo");
  let dataUri = dymoGen.addDataControl("http://api.openweathermap.org/data/2.5/weather?appid=3d77879a046ee9e970e66bb2f5c5200d&q=london", "return json['main']['temp']");
  let fadeSliderUri = dymoGen.addControl("fade", uris.SLIDER);
  let bpbSliderUri = dymoGen.addControl("beats per bar", uris.SLIDER);
  let offbeatSliderUri = dymoGen.addControl("offbeat duration", uris.SLIDER);
  let transitionButtonUri = dymoGen.addControl("transition", uris.BUTTON);
  expressionGen.addConstraint(renderingUri, `
    ∀ m in ["`+mixDymoUri+`"]
    => ∀ a in ["`+dataUri+`"]
    => Fade(m) == (a-273.16)/40
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ m in ["`+mixDymoUri+`"]
    => ∀ f in ["`+fadeSliderUri+`"]
    => Fade(m) == f
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ d : `+uris.DYMO+`, LevelFeature(d) == 2
    => ∀ b in ["`+bpbSliderUri+`"]
    => PartCount(d) == 4*b
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ d : `+uris.DYMO+`, LevelFeature(d) == 2, IndexFeature(d)%2 == 1
    => ∀ o in ["`+offbeatSliderUri+`"]
    => DurationRatio(d) == o
  `);
  expressionGen.addConstraint(renderingUri, `
    ∀ r in ["`+fadeRampUri+`"]
    => ∀ t in ["`+transitionButtonUri+`"]
    => AutoControlTrigger(r) == t
  `);
  let navVar = expressionGen.addVariable('∀ x : '+uris.DYMO+', LevelFeature(x) == 2');
  dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
  return dymoGen.getManager().getStore().uriToJsonld(renderingUri);
}

function writeFile(path: string, content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err) => {
      if (err) return reject(err);
      resolve('file saved at ' + path);
    });
  });
}