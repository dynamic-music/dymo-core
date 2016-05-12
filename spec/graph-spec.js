describe("a dynamic music object graph store", function() {
	
	//jasmine.DEFAULT_TIMEOUT_INTERVAL = 25000;
	
	it("loads a dymo from json", function(done) {
		loadFile("files/dymo-real.json", function(loaded) {
		loadFile("../ontologies/context.json", function(context) {
			jsonld.toRDF(loaded, {format: 'application/nquads'}, function(err, nquads) {
				console.log(nquads)
				var store = N3.Store();
				var writer = N3.Writer({ format: 'application/nquads' });
				N3.Parser().parse(nquads, function (error, triple, prefixes) {
					if (triple) {
						store.addTriple(triple);
						writer.addTriple(triple);
					} else {
						writer.end(function (error, result) {
							//console.log(result)
							jsonld.fromRDF(result.split('b0_').join(''), {format: 'application/nquads'}, function(err, doc) {
								jsonld.frame(doc, {"@id":"http://tiny.cc/dymo-context/"+loaded["@id"]}, function(err, framed) {
									jsonld.compact(framed, context, function(err, compacted) {
										removeBlankNodeIds(compacted);
										console.log(JSON.stringify(compacted, null, 2));
										done();
									});
									done();
								});
							}); });
						//var results = store.find("http://tiny.cc/dymo-context/"+loaded["@id"], null, null);
						//console.log(results);
					}
				});
			});
		});
		});
	});
	
	function removeBlankNodeIds(obj) {
		if (obj && obj instanceof Object) {
			for (var key in obj) {
				if (key == "@id" && obj[key].includes("_:b")) {
					delete obj[key];
				} else {
					removeBlankNodeIds(obj[key]);
				}
			}
		}
	}
	
	/*it("tests rdfstore", function(done) {
		loadFile("files/dymo-real.json", function(loaded) {
			console.profile("rdfstore");
			console.log(loaded)
			rdfstore.create(function(err, store) {
				console.log("create")
				store.load("application/ld+json", loaded, "ex:test", function(err,results) {
					console.log("load")
					store.node("http://tiny.cc/dymo-context/"+loaded["@id"], "ex:test", function(err, graph) {
						console.log("node")
						//console.log(graph)
						expect(graph).not.toBeUndefined();
						console.profileEnd();
						done();
					});
				});
			});
		});
	});*/
	
	/*it("tests levelgraph", function(done) {
		var db = levelgraph(level("dymodb"))
		var jsonld = levelgraphJSONLD(db);
		var n3 = levelgraphN3(db);
		loadFile("files/dymo-mini.json", function(loaded) {
			console.profile("levelgraph");
			jsonld.jsonld.put(loaded, function(err, obj) {
				db.get({ subject: "http://tiny.cc/dymo-context/"+loaded["@id"] }, function(err, solution) {
					console.log(solution)
					jsonld.jsonld.get("http://tiny.cc/dymo-context/"+loaded["@id"], { '@context': loaded['@context'] }, function(err, turtle) {
						console.log(turtle)
						//expect(solution.length).toEqual(16);
						//expect(solution).not.toBeUndefined();
						console.profileEnd();
						level.destroy("dymodb");
						db.close();
						done();
					});
				});
				/*n3.n3.get("http://tiny.cc/dymo-context/"+loaded["@id"], { '@context': loaded['@context'] }, function(err, turtle) {
					console.log(turtle)
					//expect(solution.length).toEqual(16);
					//expect(solution).not.toBeUndefined();
					console.profileEnd();
					done();
				});
			});
		});
	});*/
	
	function loadFile(path, callback) {
		var request = new XMLHttpRequest();
		request.open('GET', path, true);
		request.onload = function() {
			callback(JSON.parse(this.responseText));
		}
		request.send();
	}
	
});