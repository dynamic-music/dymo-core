import 'isomorphic-fetch';
import * as fs from 'fs';
import { DymoStore } from '../../src/io/dymostore';
import { DymoGenerator, uris } from '../../src/index';
import { ExpressionGenerator } from '../../src/generator/expression-generator';
import { SERVER_ROOT, SERVER, AUDIO_CONTEXT } from './server';

interface StoreAndGens {
  store: DymoStore,
  dymoGen: DymoGenerator,
  expressionGen: ExpressionGenerator
}

function createStoreAndGens(): Promise<StoreAndGens> {
  let sg: StoreAndGens = { store: null, dymoGen: null, expressionGen: null };
  sg.store = new DymoStore();
  return sg.store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
    sg.dymoGen = new DymoGenerator(sg.store);
    sg.expressionGen = new ExpressionGenerator(sg.store);
    return sg;
  });
}

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
  return createStoreAndGens().then(sg => {
    let renderingUri = sg.dymoGen.addRendering(uris.CONTEXT_URI+"dymo0");
    sg.dymoGen.addCustomParameter(uris.LISTENER_ORIENTATION, renderingUri);
    let slider1Uri = sg.dymoGen.addControl("Slider 1", uris.SLIDER, uris.CONTEXT_URI+"slider1");
    let slider2Uri = sg.dymoGen.addControl("Orientation", uris.SLIDER, uris.CONTEXT_URI+"orientation");
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ x : `+uris.DYMO+`, LevelFeature(x) == 1
      => ∀ c in ["`+slider1Uri+`"]
      => Amplitude(x) == c
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ x : `+uris.DYMO+`, DurationRatio(x) > 0.7
      => ∀ c in ["`+slider1Uri+`"]
      => PlaybackRate(x) == c
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ l : `+uris.LISTENER_ORIENTATION+`
      => ∀ o in ["`+slider2Uri+`"]
      => l == 360*o
    `);
    let navVar = sg.expressionGen.addVariable('∀ x : '+uris.DYMO+', LevelFeature(x) == 2');
    sg.dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
    return sg.store.uriToJsonld(renderingUri);
  });
}

function generateSimilarityRendering(): Promise<string> {
  return createStoreAndGens().then(sg => {
    let renderingUri = sg.dymoGen.addRendering(uris.CONTEXT_URI+"similarityDymo");
    let navVar = sg.expressionGen.addVariable('∀ d : '+uris.DYMO+', LevelFeature(d) == 1');
    sg.dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
    return sg.store.uriToJsonld(renderingUri);
  });
}

function createMixDymo() {
  return createStoreAndGens().then(sg => {
    let mixDymoUri = sg.dymoGen.addDymo(null, null, uris.CONJUNCTION, uris.CONTEXT_URI+"mixdymo");
    let fadeParam = sg.dymoGen.addCustomParameter(uris.CONTEXT_URI+"Fade", mixDymoUri);
    let tempoParam = sg.dymoGen.addCustomParameter(uris.CONTEXT_URI+"Tempo", mixDymoUri);
    sg.dymoGen.addDymo(mixDymoUri, null, uris.DISJUNCTION, uris.CONTEXT_URI+"dymo0");
    sg.dymoGen.addDymo(mixDymoUri, null, uris.DISJUNCTION, uris.CONTEXT_URI+"dymo00");
    sg.expressionGen.addConstraint(mixDymoUri, `
      ∀ d : `+uris.DYMO+`, LevelFeature(d) == 1
      => ∀ f in ["`+fadeParam+`"]
      => Amplitude(d) == (1-f)*(1-IndexFeature(d)) + f*IndexFeature(d)
    `);
    sg.expressionGen.addConstraint(mixDymoUri, `
      ∀ d : `+uris.DYMO+`, LevelFeature(d) == 3
      => ∀ t in ["`+tempoParam+`"]
      => TimeStretchRatio(d) == t/60*DurationFeature(d)
    `);
    return sg.store.uriToJsonld(mixDymoUri);
  });
}

function createMixDymoRendering(): Promise<string> {
  return createStoreAndGens().then(sg => {
    let mixDymoUri = uris.CONTEXT_URI+"mixdymo";
    let fadeRampUri = uris.CONTEXT_URI+"fadeRamp";
    let renderingUri = sg.dymoGen.addRendering(uris.CONTEXT_URI+"mixdymo");
    let dataUri = sg.dymoGen.addDataControl("http://api.openweathermap.org/data/2.5/weather?appid=3d77879a046ee9e970e66bb2f5c5200d&q=london", "return json['main']['temp']");
    let fadeSliderUri = sg.dymoGen.addControl("fade", uris.SLIDER);
    let bpbSliderUri = sg.dymoGen.addControl("beats per bar", uris.SLIDER);
    let offbeatSliderUri = sg.dymoGen.addControl("offbeat duration", uris.SLIDER);
    let transitionButtonUri = sg.dymoGen.addControl("transition", uris.BUTTON);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ m in ["`+mixDymoUri+`"]
      => ∀ a in ["`+dataUri+`"]
      => Fade(m) == (a-273.16)/40
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ m in ["`+mixDymoUri+`"]
      => ∀ f in ["`+fadeSliderUri+`"]
      => Fade(m) == f
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ d : `+uris.DYMO+`, LevelFeature(d) == 2
      => ∀ b in ["`+bpbSliderUri+`"]
      => PartCount(d) == 4*b
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ d : `+uris.DYMO+`, LevelFeature(d) == 2, IndexFeature(d)%2 == 1
      => ∀ o in ["`+offbeatSliderUri+`"]
      => DurationRatio(d) == o
    `);
    sg.expressionGen.addConstraint(renderingUri, `
      ∀ r in ["`+fadeRampUri+`"]
      => ∀ t in ["`+transitionButtonUri+`"]
      => AutoControlTrigger(r) == t
    `);
    let navVar = sg.expressionGen.addVariable('∀ x : '+uris.DYMO+', LevelFeature(x) == 2');
    sg.dymoGen.addNavigator(uris.SIMILARITY_NAVIGATOR, navVar);
    return sg.store.uriToJsonld(renderingUri);
  });
}

function writeFile(path: string, content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err) => {
      if (err) return reject(err);
      resolve('file saved at ' + path);
    });
  });
}