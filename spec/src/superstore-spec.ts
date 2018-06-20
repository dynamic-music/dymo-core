import 'isomorphic-fetch';
import { SuperDymoStore } from '../../src/globals/types';
//import { SuperStoreService } from '../../src/io/superstore-service';
import { SuperStorePromiser } from '../../src/io/superstore-promiser';
import { SERVER_ROOT } from './server';
import { CONTEXT_URI } from '../../src/globals/uris';

const CU = CONTEXT_URI;

describe("a superdymostore", function() {

  let store: SuperDymoStore;

  beforeAll(async (done) => {
    store = new SuperStorePromiser();
    await store.loadOntologies(SERVER_ROOT+'ontologies/');
    done();
  });

  it("does something", function() {
		store.addRendering(CU+"r0", CU+"d0");
	});

});
