import * as uris from '../globals/uris';
import { DymoStructureInducer } from './dymo-structure';
import { DymoGenerator } from './dymo-generator';
import { FeatureLoader, Segment, Feature } from './feature-loader';
import { mapSeries } from '../util/util';

export module DymoTemplates {

  export async function createSingleSourceDymoFromFeatures(generator: DymoGenerator, source: string, 
      segmentationUris: string[], segmentationConditions: string[], featureUris: string[]): Promise<string> {
    const dymoUri = await generator.addDymo(undefined, source);
    const segmentations = await loadMultipleFeatures(generator, dymoUri, segmentationUris, segmentationConditions);
    await Promise.all(segmentations.map(f => generator.addSegmentation(f.data, dymoUri)));
    const features = await loadMultipleFeatures(generator, dymoUri, featureUris, []);
    await Promise.all(features.map(f => generator.addFeature(f.name, f.data, dymoUri)));
    //generator.getManager().reloadFromStore();
    return dymoUri;
  }

  export async function createMultiSourceDymo(generator: DymoGenerator, parentDymo, dymoType, sources, featureUris): Promise<string> {
    var conjunctionDymo = await generator.addDymo(parentDymo, null, dymoType);
    await Promise.all(sources.map(async (s,i) => {
      var dymoUri = await generator.addDymo(conjunctionDymo, s);
      const fs = await loadMultipleFeatures(generator, dymoUri, featureUris[i], null);
      return Promise.all(fs.map(f => generator.addFeature(f.name, f.data, dymoUri)));
    }));
    return conjunctionDymo;
  }

  export async function createSimilarityDymoFromFeatures(generator: DymoGenerator, source, featureUris, conditions, similarityThreshold) {
    var dymoUri = await generator.addDymo(undefined, source);
    await loadMultipleFeatures(generator, dymoUri, featureUris, conditions)
    await new DymoStructureInducer(generator.getStore())
      .addSimilaritiesTo(generator.getCurrentTopDymo(), similarityThreshold);
    await generator.addRendering();
    //generator.addNavigator(uris.SIMILARITY_NAVIGATOR, {"d":uris.LEVEL_FEATURE}, "return d == 0");
  }

  /*export async function createStructuredDymoFromFeatures(generator: DymoGenerator, options): Promise<IterativeSmithWatermanResult> {
    const inducer = new DymoStructureInducer(generator.getStore())
    await inducer.flattenStructure(generator.getCurrentTopDymo());
    /*return generator.getManager().reloadFromStore()
      .then(() => {*
        return inducer.testSmithWaterman(generator.getCurrentTopDymo(), options);
        //DymoStructureInducer.addStructureToDymo2(generator.getCurrentTopDymo(), generator.getManager().getStore(), options);
        /*generator.addRendering();
        return generator.getManager().reloadFromStore()
         .then(() => result);
      });*
  }*/

  export async function testSmithWatermanComparison(generator: DymoGenerator, options, uri1, uri2) {
    await new DymoStructureInducer(generator.getStore())
      .compareSmithWaterman(uri1, uri2, options);
    //DymoStructureInducer.addStructureToDymo2(generator.getCurrentTopDymo(), generator.getManager().getStore(), options);
    await generator.addRendering();
    //return generator.getManager().reloadFromStore();
  }

  export async function createSimilaritySuccessorDymoFromFeatures(generator: DymoGenerator, source, featureUris, conditions, similarityThreshold, onLoad) {
    var dymoUri = await generator.addDymo(undefined, source);
    const inducer = new DymoStructureInducer(generator.getStore());
    await loadMultipleFeatures(generator, dymoUri, featureUris, conditions);
    await inducer.addSimilaritiesTo(generator.getCurrentTopDymo(), similarityThreshold);
    await inducer.addSuccessionGraphTo(generator.getCurrentTopDymo(), similarityThreshold);
    await generator.addRendering();
    //generator.addNavigator(uris.GRAPH_NAVIGATOR, {"d":uris.LEVEL_FEATURE}, "return d == 0");
    //generator.updateGraphs();
    onLoad();
  }

  //expects featurePaths to contain a bar and beat tracker file, followed by any other features
  export async function createAnnotatedBarAndBeatDymo2(generator: DymoGenerator, sourcePath: string, barsAndBeats: Segment[]): Promise<string> {
    let dymoUri = await generator.addDymo(null, sourcePath);
    let bars = barsAndBeats.filter(b => b.value === "1");
    await generator.addSegmentation(bars, dymoUri);
    await generator.addSegmentation(barsAndBeats, dymoUri);
    return Promise.resolve(dymoUri);
  }

  //expects featurePaths to contain a bar and beat tracker file, followed by any other features
  export function createAnnotatedBarAndBeatDymo(generator: DymoGenerator, featureUris, onLoad) {
    var uris = [featureUris[0], featureUris[0]];
    var conditions = ['1',''];
    for (var i = 1; i < featureUris.length; i++) {
      uris[i+1] = featureUris[i];
      conditions[i+1] = '';
    }
    loadMultipleFeatures(generator, null, uris, conditions).then(() => onLoad());
  }

  async function loadMultipleFeatures(generator: DymoGenerator, dymoUri: string, featureUris: string[], conditions: string[]): Promise<Feature[]> {
    var loader = new FeatureLoader(generator.getFetcher());
    const features = await mapSeries(featureUris, (f,i) =>
      loader.loadFeature(f, conditions ? conditions[i] : null)
    );
    return features.filter(f => f);
  }

  /*export function createPitchHelixDmo() {
    chromaFeature = getFeature("chroma");
    heightFeature = getFeature("height");
    var previousDmo = null;
    for (var i = 0; i < 48; i++) {
      var currentDmo = createNewDmo();
      if (previousDmo) {
        addPartDmo(previousDmo, currentDmo);
      } else {
        addTopDmo(currentDmo);
      }
      var cos = Math.cos((i % 12) / 6 * Math.PI);
      var sin = Math.sin((i % 12) / 6 * Math.PI);
      setDymoFeature(currentDmo, chromaFeature, cos+1);
      setDymoFeature(currentDmo, heightFeature, sin+1+(i/4.5));
      previousDmo = currentDmo;
    }
  }*/

  /*export function createGratefulDeadDymo(generator, $scope, $http) {
    var dir = 'features/gd_test/Candyman/_studio/';
    var uris = [];
    uris[0] = dir+'gd1981-05-02d1t05_vamp_segmentino_segmentino_segmentation.n3';
    //uris[1] = dir+'gd1981-05-02d1t05_vamp_qm-vamp-plugins_qm-barbeattracker_beats.n3';
    //uris[2] = dir+'gd1981-05-02d1t05_vamp_qm-vamp-plugins_qm-barbeattracker_beats.n3';
    uris[1] = dir+'gd1981-05-02d1t05_vamp_vamp-libxtract_crest_crest.n3';
    uris[2] = dir+'gd1981-05-02d1t05_vamp_vamp-libxtract_loudness_loudness.n3';
    uris[3] = dir+'gd1981-05-02d1t05_vamp_vamp-libxtract_spectral_centroid_spectral_centroid.n3';
    uris[4] = dir+'gd1981-05-02d1t05_vamp_vamp-libxtract_spectral_standard_deviation_spectral_standard_deviation.n3';
    uris[5] = dir+'gd1981-05-02d1t05_vamp_qm-vamp-plugins_qm-chromagram_chromagram.n3';
    uris[6] = dir+'gd1981-05-02d1t05_vamp_qm-vamp-plugins_qm-mfcc_coefficients.n3';
    //var conditions = ['', ''];
    var conditions = ['', '1', '', '', '', '', '', ''];
    this.loadMultipleFeatures(generator, uris, conditions, 0, function() {
      Similarity.addSimilaritiesTo(generator.dymo);
      generator.similarityGraph = generator.dymo.toJsonSimilarityGraph();
      console.log(generator.similarityGraph)
      $scope.$apply();
    });
  }

  export function createGratefulDeadDymos(generator, $scope, $http) {
    var basedir = 'app/features/gd_test/';
    $http.get('getallfiles/', {params:{directory:basedir}}).success(function(songs) {
      //keep only folders
      songs = songs.filter(function(s) { return s.indexOf('.') < 0; });
      var versionUris = [];
      getNextVersions(0);
      function getNextVersions(i) {
        if (i < songs.length) {
          console.log(songs[i])
          $http.get('getallfiles/', {params:{directory:basedir+songs[i]+'/'}}).success(function(versions) {
            //keep only folders
            versions = versions.filter(function(s) { return s.indexOf('.DS_Store') < 0; });
            for (var j = 0; j < versions.length; j++) {
              versionUris.push(basedir+songs[i]+'/'+versions[j]+'/');
            }
            getNextVersions(i+1);
          });
        } else {
          console.log(versionUris)
          this.loadAndSaveMultipleDeadDymos(generator, versionUris, 0, $http);
        }
      }
    });
  }

  export function loadAndSaveMultipleDeadDymos(generator, versions, i, $http) {
    if (i < versions.length) {
      $http.get('getallfiles/', {params:{directory:versions[i]}}).success(function(features) {
        var versiondir = versions[i].substring(versions[i].indexOf('/'));
        var urisAndConditions = getUris(versiondir, features, ['segmentation.n3','crest.n3','loudness.n3','spectral_centroid.n3','standard_deviation.n3','chromagram.n3','mfcc_coefficients.n3'], ['', '1', '', '', '', '', '', '', '']);
        this.loadMultipleFeatures(generator, urisAndConditions[0], urisAndConditions[1], 0, function() {
          Similarity.addSimilaritiesTo(generator.dymo);
          generator.similarityGraph = generator.dymo.toJsonSimilarityGraph();
          var filename = versiondir.substring(0,versiondir.length-1);
          filename = filename.substring(filename.lastIndexOf('/')+1)+'.dymo.json';
          new DymoWriter($http).writeDymoToJson(generator.dymo.toJsonHierarchy(), 'features/gd_equal_similarity2/', filename);
          generator.resetDymo();
          this.loadAndSaveMultipleDeadDymos(generator, versions, i+1, $http);
        });
      });
    }
  }*/

  /*function getUris(dir, files, names, conditions) {
    var uris = [];
    var conds = [];
    for (var i = 0, l = names.length; i < l; i++) {
      var currentFile = files.filter(function(s) { return s.indexOf(names[i]) > 0; })[0];
      if (currentFile) {
        uris.push(dir+currentFile);
        conds.push(conditions[i]);
      }
    }
    return [uris, conds];
  }*/

  /*export function createAreasDemo(generator, areas) {
    generator.addDymo();
    if (areas.length > 0) {
      var brownianX = new BrownianControls();
      var brownianY = new BrownianControls();
      brownianX.frequency.update(500);
      brownianY.frequency.update(500);
      brownianX.maxStepSize.update(0.1);
      brownianY.maxStepSize.update(0.1);
      for (var i = 0; i < areas.length; i++) {
        var currentArea = areas[i];
        var currentAreaFunction = PolygonTools.getPolygonFunctionString(currentArea);
        var currentDymo = generator.dymo.getParts()[i];
        generator.dymo.addMapping(new Mapping([brownianX.brownianControl, brownianY.brownianControl], false, currentAreaFunction, [currentDymo], PLAY));
        currentAreaFunction = PolygonTools.getInterpolatedPolygonFunctionString(currentArea);
        generator.dymo.addMapping(new Mapping([brownianX.brownianControl, brownianY.brownianControl], false, currentAreaFunction, [currentDymo], AMPLITUDE));
        currentDymo.getParameter(LOOP).update(1);
      }
    } else {
      this.createRandomAreasDemo(generator);
    }
  }

  export function createRandomAreasDemo(generator) {
    var brownianX = new BrownianControls();
    var brownianY = new BrownianControls();
    brownianX.maxStepSize.update(0.03);
    brownianY.maxStepSize.update(0.03);
    for (var i = 0; i < generator.dymo.getParts().length; i++) {
      var currentArea = createRandomTriangle();
      var currentAreaFunction = PolygonTools.getPolygonFunctionString(currentArea);
      var currentDymo = generator.dymo.getParts()[i];
      generator.dymo.addMapping(new Mapping([brownianX.brownianControl, brownianY.brownianControl], false, currentAreaFunction, [currentDymo], PLAY));
      currentAreaFunction = PolygonTools.getInterpolatedPolygonFunctionString(currentArea);
      generator.dymo.addMapping(new Mapping([brownianX.brownianControl, brownianY.brownianControl], false, currentAreaFunction, [currentDymo], AMPLITUDE));
      currentDymo.getParameter(LOOP).update(1);
    }
  }*/

  function createRandomTriangle() {
    return [{0:Math.random(),1:Math.random()},{0:Math.random(),1:Math.random()},{0:Math.random(),1:Math.random()}];
  }

}