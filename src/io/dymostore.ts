import { Util } from 'n3'
import { fromRDF, frame, flatten, compact } from 'jsonld'
import * as _ from 'lodash'
import { intersectArrays } from 'arrayutils'
import { EasyStore } from './easystore'
import * as uris from '../globals/uris'
import { DYMO_CONTEXT, DYMO_SIMPLE_CONTEXT } from '../globals/contexts'
import { URI_TO_TERM } from '../globals/terms'
import { AttributeInfo, ValueObserver, PartsObserver, JsonGraph, JsonEdge } from '../globals/types'

/**
 * A graph store for dymos based on EasyStore.
 */
export class DymoStore extends EasyStore {

	private onlinePath = "https://tiny.cc/";
	private dymoOntologyPath = "dymo-ontology";
	private mobileOntologyPath = "mobile-audio-ontology";
	private expressionOntologyPath = "expression-ontology";
	private dymoContextPath = this.onlinePath+"dymo-context";
	//private dymoSimpleContextPath = "dymo-context-simple";
	private dymoBasePaths = {};
	private partsObservers = new Map<string, PartsObserver[]>();

	//loads some basic ontology files
	loadOntologies(localPath?: string): Promise<any> {
		let dymoPath, mobilePath, expressionPath;
		if (localPath) {
			dymoPath = localPath+this.dymoOntologyPath+'.n3';
			mobilePath = localPath+this.mobileOntologyPath+'.n3';
			expressionPath = localPath+this.expressionOntologyPath+'.n3';
		} else {
			dymoPath = this.onlinePath+this.dymoOntologyPath;
			mobilePath = this.onlinePath+this.mobileOntologyPath;
			expressionPath = this.onlinePath+this.expressionOntologyPath;
		}
		return this.loadFileIntoStore(expressionPath)
			.then(() => this.loadFileIntoStore(dymoPath))
			.then(() => this.loadFileIntoStore(mobilePath));
	}

	addBasePath(dymoUri, path) {
		this.dymoBasePaths[dymoUri] = path;
	}

	getBasePath(dymoUri) {
		return this.recursiveFindInParents([dymoUri], uri => this.dymoBasePaths[uri]);
	}

	//depth first search through parents. as soon as the given searchFunction returns something, return it
	private recursiveFindInParents(dymoUris, searchFunction) {
		for (var i = 0; i < dymoUris.length; i++) {
			var currentResult = searchFunction(dymoUris[i]);
			if (currentResult) {
				return currentResult;
			}
		}
		for (var i = 0; i < dymoUris.length; i++) {
			var currentResult = this.recursiveFindInParents(this.findParents(dymoUris[i]), searchFunction);
			if (currentResult) {
				return currentResult;
			}
		}
	}

	getAllSourcePaths() {
		var sourcePathTriples = this.find(null, uris.HAS_SOURCE);
		return sourcePathTriples.map(t => {
			const basePath = this.getBasePath(t.subject);
			const sourcePath = this.getLiteralValue(t.object);
			return basePath ? basePath+sourcePath : sourcePath;
		});
	}

	getSourcePath(dymoUri) {
		var sourcePath = this.findObjectValue(dymoUri, uris.HAS_SOURCE);
		if (sourcePath) {
			var basePath = this.getBasePath(dymoUri);
			return basePath ? basePath+sourcePath : sourcePath;
		}
		var parentUris = this.findParents(dymoUri);
		if (parentUris.length > 0) {
			for (var i = 0; i < parentUris.length; i++) {
				var parentSourcePath = this.getSourcePath(parentUris[i]);
				if (parentSourcePath) {
					return parentSourcePath;
				}
			}
		}
	}

	addSpecificParameterObserver(parameterUri: string, observer: ValueObserver) {
		this.addValueObserver(parameterUri, uris.VALUE, observer);
	}

	addParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): string {
		if (dymoUri && parameterType) {
			//add parameter if there is none so far and get uri
			var parameterUri = this.setParameter(dymoUri, parameterType);
			//add observer
			this.addValueObserver(parameterUri, uris.VALUE, observer);
			return parameterUri;
		}
	}

	getParameterObservers(dymoUri, parameterType) {
		if (dymoUri && parameterType) {
			var parameterUri = this.findObjectOfType(dymoUri, uris.HAS_PARAMETER, parameterType);
			if (parameterUri) {
				return this.getValueObservers(parameterUri, uris.VALUE);
			}
		}
	}

	removeParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): string {
		if (dymoUri && parameterType) {
			var parameterUri = this.findObjectOfType(dymoUri, uris.HAS_PARAMETER, parameterType);
			if (parameterUri) {
				this.removeValueObserver(parameterUri, uris.VALUE, observer);
				return parameterUri;
			}
		}
	}

	addPartsObserver(dymoUri: string, observer: PartsObserver) {
		if (dymoUri) {
			if (!this.partsObservers.has(dymoUri)) {
				this.partsObservers.set(dymoUri, []);
			}
			const observers = this.partsObservers.get(dymoUri);
			if (observers.indexOf(observer) < 0) {
				observers.push(observer);
			}
		}
	}

	private getPartsObservers(dymoUri: string): PartsObserver[] {
		const observers = this.partsObservers.get(dymoUri);
		return observers ? observers : [];
	}

	removePartsObserver(dymoUri: string, observer: PartsObserver) {
		const observers = this.getPartsObservers(dymoUri);
		const index = observers.indexOf(observer);
		if (index >= 0) {
			observers.splice(index, 1);
		}
	}

	notifyPartsObservers(dymoUri: string) {
		this.getPartsObservers(dymoUri).forEach(o => o.observedPartsChanged(dymoUri));
	}

	///////// ADDING FUNCTIONS //////////

	addDymo(dymoUri: string, parentUri?: string, partUri?: string, sourcePath?: string, type?: string) {
		this.addTriple(dymoUri, uris.TYPE, uris.DYMO);
		if (parentUri) {
			this.addPart(parentUri, dymoUri);
		} else {
			this.setFeature(dymoUri, uris.LEVEL_FEATURE, 0);
		}
		if (partUri) {
			this.addPart(dymoUri, partUri);
		}
		if (sourcePath) {
			this.addTriple(dymoUri, uris.HAS_SOURCE, Util.createLiteral(sourcePath));
		}
		if (type) {
			this.addTriple(dymoUri, uris.CDT, type);
		}
		return dymoUri;
	}

	//removes a dymo and its part relations (TODO REMOVE EVERYTHING ELSE TOO!)
	removeDymo(dymoUri) {
		this.removeTriple(dymoUri, uris.TYPE, uris.DYMO);
		this.removeParts(dymoUri);
	}

	addPart(dymoUri: string, partUri: string): void {
		let index = this.addObjectToList(dymoUri, uris.HAS_PART, partUri);
		let parentLevel = this.findFeatureValue(dymoUri, uris.LEVEL_FEATURE);
		this.setFeature(partUri, uris.INDEX_FEATURE, index);
		this.setFeature(partUri, uris.LEVEL_FEATURE, parentLevel+1);
		this.notifyPartsObservers(dymoUri);
	}

	insertPartAt(dymoUri: string, partUri: string, index: number): void {
		this.insertObjectIntoList(dymoUri, uris.HAS_PART, partUri, index);
		let parentLevel = this.findFeatureValue(dymoUri, uris.LEVEL_FEATURE);
		this.setFeature(partUri, uris.INDEX_FEATURE, index);
		this.setFeature(partUri, uris.LEVEL_FEATURE, parentLevel+1);
		//update index feature of all later elements
		let tail = this.findParts(dymoUri).slice(index+1);
		tail.forEach((p,i) => this.setFeature(partUri, uris.INDEX_FEATURE, index+i+1));
		this.notifyPartsObservers(dymoUri);
	}

	/**really slow, use sparingly*/
	setParts(dymoUri, partUris) {
		this.removeParts(dymoUri);
		partUris.forEach(p => this.addPart(dymoUri, p))
	}

	/**really slow, use sparingly. removes all parts after the given index*/
	removeParts(dymoUri: string, index?: number): string[] {
		const removed = this.deleteListFrom(dymoUri, uris.HAS_PART, index);
		this.notifyPartsObservers(dymoUri);
		return removed;
	}

	replacePartAt(dymoUri, partUri, index) {
		if (dymoUri != partUri) {//avoid circular dymos
			const replaced = this.replaceObjectInList(dymoUri, uris.HAS_PART, partUri, index);
			this.notifyPartsObservers(dymoUri);
			return replaced;
		}
	}

	addSimilar(dymoUri, similarUri) {
		this.addTriple(dymoUri, uris.HAS_SIMILAR, similarUri);
	}

	addSuccessor(dymoUri, successorUri) {
		this.addTriple(dymoUri, uris.HAS_SUCCESSOR, successorUri);
	}

	setFeature(dymoUri: string, featureType: string, value?: any): string {
		if (!this.findObject(featureType, uris.TYPE)) {
			this.setTriple(featureType, uris.TYPE, uris.FEATURE_TYPE);
		}
		return this.setObjectValue(dymoUri, uris.HAS_FEATURE, featureType, uris.VALUE, value);
	}

	addCustomParameter(ownerUri: string, paramType: string): string {
		let uri = this.createBlankNode();
		if (ownerUri) {
			this.addTriple(ownerUri, uris.HAS_PARAMETER, uri);
		}
		this.addTriple(uri, uris.TYPE, paramType);
		this.addTriple(paramType, uris.TYPE, uris.PARAMETER_TYPE);
		return uri;
	}

	setControlParam(controlUri: string, parameterType: string, value: any, observer?: ValueObserver): string {
		//set the new value
		var parameterUri = this.setObjectValue(controlUri, uris.HAS_CONTROL_PARAM, parameterType, uris.VALUE, value);
		if (observer) {
			this.addValueObserver(parameterUri, uris.VALUE, observer);
		}
		return parameterUri;
	}

	setParameter(ownerUri: string, parameterType: string, value?: any): string {
		//initialize in case the parameter doesn't exist yet
		//TODO NO! doesn't work with param behavior!
		/*if (!this.findParameterUri(ownerUri, parameterType) && (value == null || isNaN(value))) {
			value = this.findObjectValue(parameterType, uris.HAS_STANDARD_VALUE);
		}*/
		//round if integer parameter
		if (value != null && this.findObject(parameterType, uris.IS_INTEGER)) {
			value = Math.round(value);
		}
		//set the new value
		return this.setObjectValue(ownerUri, uris.HAS_PARAMETER, parameterType, uris.VALUE, value);
	}

	addControl(name, type, uri?: string) {
		if (!uri) {
			uri = this.createBlankNode();
		}
		if (name) {
			this.addTriple(uri, uris.NAME, Util.createLiteral(name));
		}
		this.addTriple(uri, uris.TYPE, type);
		return uri;
	}

	addDataControl(url, map) {
		var uri = this.addControl(null, uris.DATA_CONTROL);
		this.addTriple(uri, uris.HAS_URL, Util.createLiteral(url));
		this.addTriple(uri, uris.HAS_JSON_MAP, Util.createLiteral(map));
		return uri;
	}

	addRendering(renderingUri, dymoUri) {
		this.addTriple(renderingUri, uris.TYPE, uris.RENDERING);
		this.addTriple(renderingUri, uris.HAS_DYMO, dymoUri);
	}

	addNavigator(renderingUri: string, navigatorType: string, variableUri: string): string {
		var navUri = this.createBlankNode();
		this.addTriple(renderingUri, uris.HAS_NAVIGATOR, navUri);
		this.addTriple(navUri, uris.TYPE, navigatorType);
		this.addTriple(navUri, uris.NAV_DYMOS, variableUri);
		return navUri;
	}

	/**really slow, use sparingly*/
	updatePartOrder(dymoUri, attributeName) {
		var parts = this.findParts(dymoUri);
		if (parts.length > 0) {
			parts.sort((p,q) => this.findAttributeValue(p, attributeName) - this.findAttributeValue(q, attributeName));
			this.setParts(dymoUri, parts);
		}
	}


	///////// QUERY FUNCTIONS //////////

	//returns an array with all uris of dymos that do not have any parents
	findTopDymos() {
		var allDymos = this.findSubjects(uris.TYPE, uris.DYMO);
		var allParents = this.findSubjects(uris.HAS_PART, null);
		var allParts = _.flatten(allParents.map(p => this.findParts(p)));
		return _.difference(allDymos, allParts);
	}

	//returns an array with the uris of all parts of the object with the given uri
	findParts(dymoUri) {
		return this.findAllObjects(dymoUri, uris.HAS_PART);
	}

	findPartAt(dymoUri, index) {
		return this.findObjectInListAt(dymoUri, uris.HAS_PART, index);
	}

	//returns an array with the uris of all similars of the object with the given uri
	findSimilars(dymoUri) {
		//TODO DOESNT WORK WITH LISTS!!!!!
		return this.findAllObjects(dymoUri, uris.HAS_SIMILAR);
	}

	//returns an array with the uris of all successors of the object with the given uri
	findSuccessors(dymoUri) {
		//TODO DOESNT WORK WITH LISTS!!!!!
		return this.findAllObjects(dymoUri, uris.HAS_SUCCESSOR);
	}

	findAllParents(dymoUri: string): string[] {
		let parents = this.findParents(dymoUri);
		return parents.concat(_.flatMap(parents, p => this.findAllParents(p)));
	}

	findParents(dymoUri: string): string[] {
		return this.findContainingLists(dymoUri, uris.HAS_PART);
	}

	//returns an array with the uris of all parts, parts of parts, etc of the object with the given uri
	findAllObjectsInHierarchy(dymoUri) {
		if (dymoUri) {
			var allObjects = [dymoUri];
			var parts = this.findParts(dymoUri);
			//if (parts.length > 0) console.log(dymoUri, parts.map(p => p ? parseInt(p.match(/\d+/)[0]) : null));
			for (var i = 0; i < parts.length; i++) {
				allObjects = allObjects.concat(this.findAllObjectsInHierarchy(parts[i]));
			}
			return allObjects;
		}
	}

	findDymoRelations() {
		var domainUris = this.findSubjects(uris.DOMAIN, uris.DYMO);
		var rangeUris = this.findSubjects(uris.RANGE, uris.DYMO);
		//TODO FIND uris.HAS_PART AUTOMATICALLY..
		return [uris.HAS_PART].concat(intersectArrays(domainUris, rangeUris));
	}

	findNavigators(renderingUri) {
		return this.findAllObjects(renderingUri, uris.HAS_NAVIGATOR);
	}

	findAttributeUri(dymoUri: string, attributeType: string) {
		var uri = this.findObjectOfType(dymoUri, uris.HAS_PARAMETER, attributeType);
		if (uri == null) {
			uri = this.findObjectOfType(dymoUri, uris.HAS_FEATURE, attributeType);
		}
		return uri;
	}

	findAttributeValue(dymoUri: string, attributeType: string) {
		var value = this.findFeatureValue(dymoUri, attributeType);
		if (value == null) {
			value = this.findParameterValue(dymoUri, attributeType);
		}
		return value;
	}

	findFeatureValue(dymoUri: string, featureType: string) {
		return this.findObjectValueOfType(dymoUri, uris.HAS_FEATURE, featureType, uris.VALUE);
	}

	findAllFeatureValues(dymoUri: string) {
		return this.findAllObjectValuesOfType(dymoUri, uris.HAS_FEATURE, uris.VALUE)
	}

	findAllNumericFeatureValues(dymoUri: string) {
		return this.findAllFeatureValues(dymoUri).filter(v => !isNaN(v));
	}

	findControlParamValue(controlUri: string, parameterType: string) {
		return this.findObjectValueOfType(controlUri, uris.HAS_CONTROL_PARAM, parameterType, uris.VALUE);
	}

	findParameterValue(ownerUri: string, parameterType: string) {
		if (ownerUri) {
			return this.findObjectValueOfType(ownerUri, uris.HAS_PARAMETER, parameterType, uris.VALUE);
		}
		//if no owner specified, return value of the first found independent param
		let paramUri = this.findSubject(uris.TYPE, parameterType);
		if (paramUri) {
			return this.findObjectValue(paramUri, uris.VALUE);
		}
	}

	findParameterUri(ownerUri: string, parameterType: string) {
		if (ownerUri) {
			return this.findObjectOfType(ownerUri, uris.HAS_PARAMETER, parameterType);
		}
		return this.findSubject(null, parameterType);
	}

	/*//TODO FOR NOW ONLY WORKS WITH SINGLE HIERARCHY..
	findPartIndex(dymoUri: string) {
		var firstParentUri = this.findParents(dymoUri)[0];
		return this.findObjectIndexInList(firstParentUri, uris.HAS_PART, dymoUri);
	}

	//TODO FOR NOW ONLY WORKS WITH SINGLE HIERARCHY..
	findLevel(dymoUri: string) {
		var level = 0;
		var parent = this.findParents(dymoUri)[0];
		while (parent) {
			level++;
			parent = this.findParents(parent)[0];
		}
		return level;
	}*/

	findMaxLevel(dymoUri?: string): number {
		let dymos = dymoUri ? this.findAllObjectsInHierarchy(dymoUri) : this.findSubjects(uris.TYPE, uris.DYMO);
		return dymos.reduce((max, d) => {
			let lev = this.findFeatureValue(d, uris.LEVEL_FEATURE);
			return lev > max ? lev : max;
		}, 0);
	}


	///////// WRITING FUNCTIONS //////////

	toJsonld(): Promise<string> {
		var firstTopDymo = this.findTopDymos()[0];
		return this.uriToJsonld(firstTopDymo);
	}

	uriToJsonld(frameUri: string): Promise<string> {
		return this.toRdf()
			.then(result => this.rdfToJsonld(result, frameUri));
	}

	private triplesToJsonld(triples, frameId): Promise<string> {
		return this.triplesToRdf(triples)
			.then(result => this.rdfToJsonld(result, frameId));
	}

	private rdfToJsonld(rdf, frameId): Promise<string> {
		return new Promise((resolve, reject) => {
			rdf = rdf.split('_b').join('b'); //rename blank nodes (jsonld.js can't handle the n3.js nomenclature)
			fromRDF(rdf, {format: 'application/nquads'}, (err, doc) => {
			  if (err) { console.log(err, rdf); reject(err); }
				frame(doc, {"@id":frameId}, (err, framed) => {
					//console.log(frameId, JSON.stringify(framed))
					compact(framed, DYMO_CONTEXT, (err, compacted) => {
						//deal with imperfections of jsonld.js compaction algorithm to make it reeaally nice
						compact(compacted, DYMO_SIMPLE_CONTEXT, (err, compacted) => {
							//make it even nicer by removing blank nodes
							this.removeBlankNodeIds(compacted);
							//put the right context back
							compacted["@context"] = this.dymoContextPath;
							//compact local uris
							var result = JSON.stringify(compacted);
							result = result.replace(new RegExp(this.dymoContextPath+'/', 'g'), "");
							result = result.replace(new RegExp(this.dymoContextPath.replace('https','http')+'/', 'g'), "");
							resolve(result);
						});
					});
				});
			});
		});
	}

	//returns a jsonld representation of an object removed from any hierarchy of objects of the same type
	private toFlatJsonld(uri): Promise<Object> {
		var type = this.findObject(uri, uris.TYPE);
		var triples = this.recursiveFindAllTriples(uri, type, [uris.HAS_PART, uris.HAS_SIMILAR, uris.HAS_SUCCESSOR]);
		return this.triplesToJsonld(triples, uri)
			.then(result => JSON.parse(result));
	}

	/* if a previous graph is given as an argument, only reads new nodes from store */
	toJsonGraph(nodeClass, edgeProperty, previousGraph?: JsonGraph): Promise<JsonGraph> {
		//console.log(nodeClass, edgeProperty)
		if (nodeClass === uris.DYMO && edgeProperty === uris.HAS_PART) {
			return this.toJsonDymoPartGraph(previousGraph);
		}
		var graph: JsonGraph = {"nodes":[], "edges":[]};
		var nodeMap = {};
		if (previousGraph) {
			//fill nodeMap with previous nodes
			previousGraph.nodes.forEach(n => nodeMap[uris.CONTEXT_URI+n["@id"]] = n);
		}

		var nodeUris = this.findSubjects(uris.TYPE, nodeClass);
		var edgeTriples = this.find(null, edgeProperty, null);
		var uncachedNodes = _.difference(nodeUris, Object.keys(nodeMap));

		return new Promise(resolve => {
			//only load new nodes from store
			Promise.all(uncachedNodes.map(uri => this.toFlatJsonld(uri)))
			.then(result => {
				result.forEach(n => nodeMap[uris.CONTEXT_URI+n["@id"]] = n);
				graph.nodes = nodeUris.map(uri => nodeMap[uri]);
				//edges are always new
				graph["edges"] = this.createEdges(edgeTriples, edgeProperty, nodeClass, nodeMap);
				resolve(graph);
			});
		});
	}

	toJsonDymoPartGraph(previousGraph?: JsonGraph): Promise<JsonGraph> {
		var graph: JsonGraph = {"nodes":[], "edges":[]};
		var nodeMap = {};
		if (previousGraph) {
			//fill nodeMap with previous nodes
			previousGraph.nodes.forEach(n => nodeMap[uris.CONTEXT_URI+n["@id"]] = n);
		}

		var nodeUris = this.findSubjects(uris.TYPE, uris.DYMO);
		var edgeTriples = this.find(null, uris.HAS_PART, null);
		var uncachedNodes = _.difference(nodeUris, Object.keys(nodeMap));

		return new Promise(resolve => {
			//only load new nodes from store
			Promise.all(uncachedNodes.map(uri => this.toFlatDymoJsonld(uri)))
			.then(result => {
				result.forEach(n => nodeMap[uris.CONTEXT_URI+n["@id"]] = n);
				graph.nodes = nodeUris.map(uri => nodeMap[uri]);
				//edges are always new
				graph["edges"] = this.createEdges(edgeTriples, uris.HAS_PART, uris.DYMO, nodeMap);
				resolve(graph);
			});
		});
	}

	//returns a jsonld representation of an object removed from any hierarchy of objects of the same type
	private toFlatDymoJsonld(uri): Promise<Object> {
		let triples = this.find(uri, uris.HAS_FEATURE, null);
		triples = triples.concat(this.find(uri, uris.HAS_PARAMETER, null));
		let typesAndValues = _.flatten(triples.map(a => this.find(a.object, uris.TYPE, null)));
		typesAndValues = typesAndValues.concat(_.flatten(triples.map(a => this.find(a.object, uris.VALUE, null))));
		triples = triples.concat(typesAndValues);
		triples = triples.concat(this.find(uri, uris.TYPE, null));
		return this.triplesToJsonld(triples, uri)
			.then(result => JSON.parse(result));
	}

	private createEdges(edgeTriples, edgeProperty, nodeClass, nodeMap): JsonEdge[] {
		var edges = [];
		for (var i = 0; i < edgeTriples.length; i++) {
			if (this.find(edgeTriples[i].object, uris.TYPE, nodeClass).length == 0) {
				if (this.find(edgeTriples[i].object, uris.FIRST, null).length > 0) {
					//it's a list!!
					var objects = this.findObjectOrList(edgeTriples[i].subject, edgeProperty);
					objects = objects.map(t => this.createLink(nodeMap[edgeTriples[i].subject], nodeMap[t]));
					edges = edges.concat(objects);
				}
			} else {
				edges.push(this.createLink(nodeMap[edgeTriples[i].subject], nodeMap[edgeTriples[i].object]));
			}
		}
		return edges;
	}

	/*this.toJsonMappingGraph(callback) {
		var graph = {"nodes":[], "edges":[]};
		var nodeMap = {};
		var nodeUris = [];
		var edges = [];
		var mappingUris = store.findAllObjects(renderingUri, uris.HAS_MAPPING);
		for (var i = 0; i < mappingUris.length; i++) {
			var domainDimUris = store.findAllObjects(mappingUris[i], HAS_DOMAIN_DIMENSION);
			for (var j = 0; j < domainDimUris.length; j++) {
				edges.push(domainDimUris, mappingUris[i])
			}
			var rangeUri = store.findObject(mappingUri, HAS_RANGE);
		}



		for (var i = 0; i < this.findAllSubjects(uris.TYPE, nodeClass);
		var edgeTriples = this.find(null, edgeProperty, null);
		async.map(nodeUris, toFlatJsonld, function(err, result){
			graph["nodes"] = result;
			for (var i = 0; i < nodeUris.length; i++) {
				nodeMap[nodeUris[i]] = graph["nodes"][i];
			}
			graph["edges"] = [];
			for (var i = 0; i < edgeTriples.length; i++) {
				if (this.find(edgeTriples[i].object, uris.TYPE, nodeClass).length == 0) {
					if (this.find(edgeTriples[i].object, FIRST).length > 0) {
						//it's a list!!
						var objects = this.findObjectOrList(edgeTriples[i].subject, edgeProperty);
						objects = objects.map(function(t){return createLink(nodeMap[edgeTriples[i].subject], nodeMap[t]);});
						graph["edges"] = graph["edges"].concat(objects);
					}
				} else {
					graph["edges"].push(createLink(nodeMap[edgeTriples[i].subject], nodeMap[edgeTriples[i].object]));
				}
			}
			callback(graph);
		});
	}*/

	private createLink(source, target) {
		return {"source":source, "target":target, "value":1};
	}

	private removeBlankNodeIds(jldObj: Object, jldStr: string = JSON.stringify(jldObj)) {
		if (jldObj && jldObj instanceof Object) {
			for (var key in jldObj) {
				if (key == "@id" && jldObj[key].includes("_:b")) {
					if (this.countOccurrences(jldStr, jldObj[key]) == 1) {
						//only remove if occurs once
						delete jldObj[key];
					}
				} else {
					this.removeBlankNodeIds(jldObj[key], jldStr);
				}
			}
		}
	}

	private countOccurrences(string: string, substring: string): number {
		return string.split(substring).length - 1;
	}

	getAttributeInfo(): AttributeInfo[] {
		let attributeObjects = {};
		let allDymos = this.findSubjects(uris.TYPE, uris.DYMO);

		//add params from store
		let allParams = _.flatten(allDymos.map(d => this.findAllObjects(d, uris.HAS_PARAMETER)));
		allParams.forEach(p => this.updateAttributeObjectFromUri(attributeObjects, p));

		//add features from store
		let allFeatures = _.flatten(allDymos.map(d => this.findAllObjects(d, uris.HAS_FEATURE)));
		allFeatures.forEach(f => this.updateAttributeObjectFromUri(attributeObjects, f));

		//convert to array
		return Object.keys(attributeObjects).map(k => attributeObjects[k]);
	}

	private updateAttributeObjectFromUri(objects, uri: string) {
		let type = this.findObject(uri, uris.TYPE);
		let value = this.findObjectValue(uri, uris.VALUE);
		this.updateAttributeObject(objects, type, value);
	}

	private updateAttributeObject(objects, type, value) {
		if (type) {
			if (!objects[type]) {
				let name = URI_TO_TERM[type] ? URI_TO_TERM[type] : _.replace(_.replace(type, uris.CONTEXT_URI, ''), uris.DYMO_ONTOLOGY_URI, '');
				objects[type] = {
					name: name,
					uri: type,
					min: Infinity,
					max: -Infinity
				};
			}
			if (!isNaN(value)) {
				objects[type].min = Math.min(value, objects[type].min);
				objects[type].max = Math.max(value, objects[type].max);
			}
		}
	}

}
