import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import * as uris from '../../src/globals/uris';
import { DymoStore } from '../../src/io/dymostore';
import { DymoManager } from '../../src/manager';
//import { DymoNavigator } from '../../src/navigators/navigator';
import { SequentialNavigator } from '../../src/navigators/sequential';
import { SimilarityNavigator } from '../../src/navigators/similarity';
import { GraphNavigator } from '../../src/navigators/graph';
import { ExpressionVariable } from '../../src/model/variable';
import { ConstraintWriter } from '../../src/io/constraintwriter';
import { Expression } from '../../src/model/expression';
import { SERVER_ROOT, AUDIO_CONTEXT, initSpeaker, endSpeaker } from './server';
import { DymoPlayer } from '../../src/audio/player';
import { DummyScheduler } from '../../src/audio/scheduler';

describe("a player", function() {

  let store;

  beforeEach(function(done) {
    GlobalVars.SCHEDULE_AHEAD_TIME = 0;
    initSpeaker();
    //(1:(2:5,6),(3:7,(8:11,12),9),(4:10)))
    store = new DymoStore();
    store.loadOntologies(SERVER_ROOT+'ontologies/').then(() => {
      store.addDymo("dymo1");
      store.addDymo("dymo2", "dymo1");
      store.addDymo("dymo3", "dymo1");
      store.addDymo("dymo4", "dymo1");
      store.addDymo("dymo5", "dymo2");
      store.addDymo("dymo6", "dymo2");
      store.addDymo("dymo7", "dymo3");
      store.addDymo("dymo8", "dymo3");
      store.addDymo("dymo9", "dymo3");
      store.addDymo("dymo10", "dymo4");
      store.addDymo("dymo11", "dymo8");
      store.addDymo("dymo12", "dymo8");
      store.addSimilar("dymo5", "dymo7");
      store.addSimilar("dymo7", "dymo5");
      store.addSimilar("dymo6", "dymo9");
      store.addSimilar("dymo8", "dymo10");
      store.addSimilar("dymo10", "dymo6");
      //dymo2.addSimilar(dymo3);
      //dymo3.addSimilar(dymo2);
      //dymo4.addSimilar(dymo5);
      //dymo4.addSimilar(dymo6);
      done();
    });
  });

  afterEach(function() {
    endSpeaker();
  });

  it("should play", function(done) {

    store.setParameter("dymo2", uris.REPEAT, 2);
    store.setTriple("dymo2", uris.TYPE, uris.CONJUNCTION);

    let delay = 100;
    let player = new DymoPlayer(store, new DummyScheduler(delay));

    checkPlayingDymos([], 0);

    player.play("dymo1")
      .then(done);

    checkPlayingDymos(["dymo1","dymo2","dymo5","dymo6"], delay*3/2)
      .then(() => checkPlayingDymos(["dymo1","dymo2","dymo5","dymo6"], delay))
      .then(() => checkPlayingDymos(["dymo1","dymo3","dymo7"], delay))
      .then(() => checkPlayingDymos(["dymo1","dymo3","dymo8","dymo11"], delay))
      .then(() => checkPlayingDymos(["dymo1","dymo3","dymo8","dymo12"], delay))
      .then(() => checkPlayingDymos(["dymo1","dymo3","dymo9"], delay))
      .then(() => checkPlayingDymos(["dymo1","dymo4","dymo10"], delay))

    function checkPlayingDymos(uris: string[], timeout: number): Promise<any> {
      return new Promise(resolve => setTimeout(
        () => resolve(expect(player.getPlayingDymoUris()).toEqual(uris)),
        timeout
      ));
    }

    /*var navigator = new DymoNavigator("dymo1", store, new SequentialNavigator("dymo1", store));
    expect(navigator.getPosition("dymo1")).toBeUndefined();
    expect(navigator.getNextParts()[0]).toBe("dymo5");
    expect(navigator.getPosition("dymo1")).toBe(0);
    //expect(navigator.getPosition("dymo2")).toBe(1);
    expect(navigator.getNextParts()[0]).toBe("dymo6");
    expect(navigator.getPosition("dymo1")).toBe(1);
    //expect(navigator.getPosition("dymo2")).toBe(0);
    expect(navigator.getNextParts()[0]).toBe("dymo7");
    expect(navigator.getNextParts()[0]).toBe("dymo11");
    expect(navigator.getNextParts()[0]).toBe("dymo12");
    expect(navigator.getNextParts()[0]).toBe("dymo9");
    expect(navigator.getPosition("dymo1")).toBe(2);
    expect(navigator.getNextParts()[0]).toBe("dymo10");
    expect(navigator.getPosition("dymo1")).toBe(0);
    //and keeps looping
    expect(navigator.getNextParts()[0]).toBe("dymo5");
    expect(navigator.getNextParts()[0]).toBe("dymo6");
    navigator.reset();
    //starts over
    expect(navigator.getNextParts()[0]).toBe("dymo5");
    expect(navigator.getNextParts()[0]).toBe("dymo6");
    expect(navigator.getNextParts()[0]).toBe("dymo7");
    expect(navigator.getNextParts()[0]).toBe("dymo11");
    expect(navigator.getNextParts()[0]).toBe("dymo12");
    expect(navigator.getNextParts()[0]).toBe("dymo9");
    expect(navigator.getNextParts()[0]).toBe("dymo10");*/
  });

});
