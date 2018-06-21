import 'isomorphic-fetch';
import { GlobalVars } from '../../src/globals/globals';
import { SuperDymoStore } from '../../src/globals/types';
import { SuperStorePromiser } from '../../src/io/superstore-promiser';
import { SERVER_ROOT } from './server';
import { CONTEXT_URI } from '../../src/globals/uris';

const CU = CONTEXT_URI;

describe("a superdymostore", function() {

  let store: SuperDymoStore;

  beforeAll(async done => {
    console.log(typeof exports !== 'undefined', typeof exports)
    //in browser and workers activated
    if (typeof exports === 'undefined' && GlobalVars.USE_WEB_WORKERS) {
      const service = await import('../../src/io/superstore-service');
      store = new service.SuperStoreService();
    } else {
      store = new SuperStorePromiser();
    }
    await store.loadOntologies(SERVER_ROOT+'ontologies/');
    done();
  });

  it("does something", function() {
		store.addRendering(CU+"r0", CU+"d0");
	});

});
