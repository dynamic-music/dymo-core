//Generates the ontologies, context files, and globals files

var fs = require('fs');
var N3 = require('n3');

var rdfPrefix = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
var rdfType = rdfPrefix+"type";

var prefixes = {
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
	"owl": "http://www.w3.org/2002/07/owl#",
	"sch": "http://schema.org/",
	"mo": "http://purl.org/ontology/mo/",
	"mt": "http://purl.org/ontology/studio/multitrack#",
	"ch": "http://tiny.cc/charm-ontology#",
	"dy": "http://tiny.cc/dymo-ontology#",
	"mb": "http://tiny.cc/mobile-audio-ontology#",
};
var contextBase = "http://tiny.cc/dymo-context/";

var writer = N3.Writer({ prefixes:prefixes });
var context = [];
var simpleContext = [];
var globals = [];
var currentBase = "";
var nameToUri = {};
var uriToTerm = {};

initContext();
initGlobals();
createDymoOntology("ontologies/dymo-ontology.n3");
createMobileAudioOntology("ontologies/mobile-audio-ontology.n3");
writeContextToFile("ontologies/dymo-context.json", context, contextBase);
writeContextToFile("ontologies/dymo-context-simple.json", simpleContext, contextBase);
writeTermDictToFile("src/globals/terms.js")
writeGlobalsToFile("src/globals/globals2.js");
writeContextsToFile("src/globals/contexts.js");

function initWriter(base) {
	writer = N3.Writer({ prefixes:prefixes });
	currentBase = base;
}

function initContext() {
	currentBase = "sch";
	addToContext("name");
	//mock charm stuff
	currentBase = "ch";
	addToContext("cdt", "cdt", "@vocab");
	addToContext("adt", "adt", "@vocab");
	addToContext("value");
	addToContext("parts", "hasPart");
}

function initGlobals() {
	addGlobal("RDFS_URI", prefixes["rdfs"]);
	addGlobal("CONTEXT_URI", contextBase);
	//SOME PROPERTIES
	addGlobal("TYPE", rdfType);
	addGlobal("FIRST", rdfPrefix+"first");
	addGlobal("REST", rdfPrefix+"rest");
	addGlobal("NIL", rdfPrefix+"nil");
	addGlobal("DOMAIN", prefixes["rdfs"]+"domain");
	addGlobal("RANGE", prefixes["rdfs"]+"range");
	addGlobal("LABEL", prefixes["rdfs"]+"label");
	addGlobal("NAME", prefixes["sch"]+"name");
	//mock charm stuff
	addGlobal("CDT", prefixes["ch"]+"cdt");
	addGlobal("ADT", prefixes["ch"]+"adt");
	addGlobal("VALUE", prefixes["ch"]+"value");
	addGlobal("HAS_PART", prefixes["ch"]+"hasPart");
}

function createDymoOntology(path) {
	initWriter("dy");
	addOntology("An ontology for describing Dynamic Music Objects");
	//dymos and dymo types
	addClass("Dymo", prefixes["ch"]+"Constituent", "A Dynamic Music Object is a hierarchical structure of musical objects with modifiable parameters");
	addClass("DymoType", prefixes["ch"]+"ConstituentType");
	addIndividual("Conjunction", "DymoType");
	addIndividual("Disjunction", "DymoType");
	addIndividual("Sequence", "DymoType");
	//parameters, features, and their types
	addClass("Feature", prefixes["ch"]+"Attribute", "A feature is an immutable attribute of a Dymo");
	addClass("Parameter", prefixes["ch"]+"Attribute", "A parameter is a mutable attribute of a Dymo");
	addClass("FeatureType", prefixes["ch"]+"AttributeType");
	addClass("ParameterType", prefixes["ch"]+"AttributeType");
	//features
	addIndividual({term:"level", iri:"LevelFeature"}, "FeatureType");
	addIndividual({term:"index", iri:"IndexFeature"}, "FeatureType");
	addIndividual({term:"onset", iri:"OnsetFeature"}, "FeatureType");
	addIndividual({term:"pitch", iri:"PitchFeature"}, "FeatureType");
	addIndividual({term:"duration", iri:"DurationFeature"}, "FeatureType");
	addIndividual({term:"time", iri:"TimeFeature"}, "FeatureType");
	addIndividual({term:"segmentLabel", iri:"SegmentLabelFeature"}, "FeatureType");
	addClass("CustomFeature", "FeatureType");
	//audio parameters
	addClass("AudioParameter", "ParameterType");
	addProperty("hasStandardValue", "ParameterType", prefixes["xsd"]+"float", true);
	addProperty("isInteger", "ParameterType", prefixes["xsd"]+"boolean", true);
	addIndividual("Play", "AudioParameter", {"hasStandardValue": 0, "isInteger": true});
	addIndividual("Loop", "AudioParameter", {"hasStandardValue": 0, "isInteger": true});
	addIndividual("Onset", "AudioParameter");
	addIndividual("DurationRatio", "AudioParameter", {"hasStandardValue": 1});
	addIndividual("Amplitude", "AudioParameter", {"hasStandardValue": 1});
	addIndividual("PlaybackRate", "AudioParameter", {"hasStandardValue": 1});
	addIndividual("TimeStretchRatio", "AudioParameter", {"hasStandardValue": 1});
	addIndividual("Pan", "AudioParameter", {"hasStandardValue": 0});
	addIndividual("Distance", "AudioParameter", {"hasStandardValue": 0});
	addIndividual("Height", "AudioParameter", {"hasStandardValue": 0});
	addIndividual("Reverb", "AudioParameter", {"hasStandardValue": 0});
	addIndividual("Delay", "AudioParameter", {"hasStandardValue": 0});
	addIndividual("Filter", "AudioParameter", {"hasStandardValue": 20000});
	//structural parameters
	addClass("StructuralParameter", "ParameterType");
	addIndividual("PartCount", "StructuralParameter");
	addIndividual("PartDurationRatio", "StructuralParameter");
	addIndividual("PartProportion", "StructuralParameter");
	addClass("CustomParameter", "ParameterType");
	//properties
	addProperty({term:"source", iri:"hasSource", type:"xsd:string"}, "Dymo", prefixes["xsd"]+"string", false);
	addProperty({term:"parameters", iri:"hasParameter", type:"@vocab"}, "Dymo", "Parameter", true);
	addProperty({term:"features", iri:"hasFeature", type:"@vocab"}, "Dymo", "Feature", true);
	addProperty({term:"paramType", iri:"hasParameterType", type:"@vocab"}, "Parameter", "ParameterType", true);
	addProperty({term:"featureType", iri:"hasFeatureType", type:"@vocab"}, "Feature", "FeatureType", true);
	addProperty({term:"similars", iri:"hasSimilar"}, "Dymo", "Dymo", true);
	addProperty({term:"successors", iri:"hasSuccessor"}, "Dymo", "Dymo", true);

	writeN3ToFile(path);
}

function createMobileAudioOntology(path) {
	initWriter("mb");
	addOntology("An ontology for describing renderings of Dynamic Music Objects on mobile devices");
	//main classes
	addClass("Rendering", prefixes["mt"]+"MultitrackProject");
	addClass("Mapping");
	addClass("Function");
	//control taxonomy
	addClass("MobileControl");
	addClass("SensorControl", "MobileControl");
	addClass("UiControl", "MobileControl");
	addClass("AutoControl", "MobileControl");
	//sensor controls
	addClass("AccelerometerX", "SensorControl");
	addClass("AccelerometerY", "SensorControl");
	addClass("AccelerometerZ", "SensorControl");
	addClass("TiltX", "SensorControl");
	addClass("TiltY", "SensorControl");
	addClass("TiltZ", "SensorControl");
	addClass("GeolocationLatitude", "SensorControl");
	addClass("GeolocationLongitude", "SensorControl");
	addClass("GeolocationDistance", "SensorControl");
	addClass("CompassHeading", "SensorControl");
	addClass("Beacon", "SensorControl");
	//ui controls
	addClass("Slider", "UiControl");
	addClass("Toggle", "UiControl");
	addClass("Button", "UiControl");
	addClass("CustomControl", "UiControl");
	//auto controls
	addClass("Random", "AutoControl");
	addClass("Brownian", "AutoControl");
	addClass("Ramp", "AutoControl");
	//parameters
	addClass("MobileParameter", prefixes["mt"]+"AutomationParameter");
	addClass("GlobalParameter", "MobileParameter");
	addClass("ControlParameter", "MobileParameter");
	addIndividual("ListenerOrientation", "GlobalParameter");
	addIndividual("AutoControlFrequency", "ControlParameter");
	addIndividual("AutoControlTrigger", "ControlParameter");
	addIndividual("BrownianMaxStepSize", "ControlParameter");
	addIndividual("LeapingProbability", "ControlParameter");
	addIndividual("ContinueAfterLeaping", "ControlParameter");
	//navigators
	addClass("Navigator");
	addClass("OneShotNavigator", "Navigator");
	addClass("RepeatedNavigator", "Navigator");
	addClass("SequentialNavigator", "Navigator");
	addClass("SimilarityNavigator", "Navigator");
	addClass("GraphNavigator", "Navigator");
	//domain dimension and mapping target
	addUnionClass("ArgumentValue", ["MobileControl", "ParameterType", "FeatureType"]);
	addUnionClass("MappingTarget", ["MobileControl", "Dymo", "Function"]);
	addUnionClass("MappingRange", ["ParameterType", "MobileParameter"]);
	addUnionClass("MappingOwners", ["Dymo", "Rendering"]);
	//mapping properties
	addProperty({term:"dymo", iri:"hasDymo", type: "@id"}, "Rendering", "Dymo", true, true);
	addProperty({term:"mappings", iri:"hasMapping"}, "MappingOwners", "Mapping", true);
	addProperty({term:"function", iri:"hasFunction"}, "Mapping", "Function", true);
	addProperty({term:"args", iri:"hasArgument"}, "Function", "Argument", true);
	addProperty({term:"var", iri:"hasVariable"}, "Argument", prefixes["xsd"]+"string", false);
	addProperty({term:"val", iri:"hasValue", type: "@vocab"}, "Argument", "ArgumentValue", true);
	addProperty({term:"body", iri:"hasBody"}, "Function", prefixes["xsd"]+"string", false);
	addProperty({term:"targets", iri:"toTarget", type: "@id"}, "Mapping", "MappingTarget", true);
	addProperty({term:"range", iri:"hasRange", type: "@vocab"}, "Mapping", "MappingRange", true);
	//control properties
	addProperty({term:"init", iri:"hasInitialValue", type: "xsd:float"}, "MobileControl", prefixes["xsd"]+"float", false);
	addProperty({term:"smooth", iri:"isSmooth", type: "xsd:boolean"}, "SensorControl", prefixes["xsd"]+"boolean", false);
	addProperty({term:"average", iri:"isAverageOf", type: "xsd:integer"}, "SensorControl", prefixes["xsd"]+"integer", false);
	addProperty({term:"uuid", iri:"hasUuid", type: "xsd:string"}, "Beacon", prefixes["xsd"]+"string", false);
	addProperty({term:"major", iri:"hasMajor", type: "xsd:integer"}, "Beacon", prefixes["xsd"]+"integer", false);
	addProperty({term:"minor", iri:"hasMinor", type: "xsd:integer"}, "Beacon", prefixes["xsd"]+"integer", false);
	addProperty({term:"rampDuration", iri:"hasDuration", type: "xsd:integer"}, "Ramp", prefixes["xsd"]+"integer", false);
	//navigator properties
	addProperty({term:"navigators", iri:"hasNavigator"}, "Rendering", "Navigator", false);
	addProperty({term:"dymos", iri:"navDymos"}, "Navigator", "Function", false);
	writeN3ToFile(path);
}

function addOntology(comment) {
	addTriple(prefixes[currentBase], rdfType, prefixes["owl"]+"Ontology");
	addTriple(prefixes[currentBase], prefixes["rdfs"]+"comment", '"'+comment+'"');
}

function addClass(name, subClassOf, comment) {
	var fullName = addToTermsContextAndGlobals(name);
	subClassOf = getFromTerms(subClassOf);
	addTriple(fullName, rdfType, prefixes["owl"]+"Class");
	if (subClassOf) {
		addTriple(fullName, prefixes["rdfs"]+"subClassOf", subClassOf);
	}
	addComment(fullName, comment);
}

function addUnionClass(name, classes, comment) {
	var fullName = addToTermsContextAndGlobals(name);
	addTriple(fullName, rdfType, prefixes["owl"]+"Class");
	classes = classes.map(function(c){ return getFromTerms(c); });
	addTriple(fullName, prefixes["owl"]+"unionOf", writer.list(classes));
	addComment(fullName, comment);
}

function addProperty(definition, domain, range, isObjectProperty, isFunctional, comment) {
	var fullName = addToTermsContextAndGlobals(definition);
	domain = getFromTerms(domain);
	range = getFromTerms(range);
	var propertyType = isObjectProperty? "ObjectProperty": "DatatypeProperty";
	addTriple(fullName, rdfType, prefixes["owl"]+propertyType);
	if (isFunctional) {
		addTriple(fullName, rdfType, prefixes["owl"]+"FunctionalProperty");
	}
	addTriple(fullName, prefixes["rdfs"]+"domain", domain);
	if (!isObjectProperty) {
		range = '"'+range+'"';
	}
	addTriple(fullName, prefixes["rdfs"]+"range", range);
	addComment(fullName, comment);
}

function addIndividual(name, type, properties, comment) {
	var fullName = addToTermsContextAndGlobals(name);
	type = getFromTerms(type);
	addTriple(fullName, rdfType, type);
	for (var p in properties) {
		setProperty(fullName, p, N3.Util.createLiteral(properties[p]));
	}
	addComment(fullName, comment);
}

function setProperty(subject, property, value) {
	addTriple(subject, getFromTerms(property), value);
}

function addComment(subject, comment) {
	if (comment) {
		addTriple(subject, prefixes["rdfs"]+"comment", '"'+comment+'"');
	}
}

function addTriple(subject, predicate, object) {
	writer.addTriple({ subject:subject, predicate:predicate, object:object });
}

function addToTermsContextAndGlobals(definition) {
	var name;
	if (typeof definition == "string") {
		name = definition;
		addToContext(name);
	} else {
		name = definition.iri;
		addToContext(definition.term, definition.iri, definition.type);
	}
	var fullName = prefixes[currentBase]+name;
	nameToUri[name] = fullName;
	uriToTerm[fullName] = definition.term;
	addGlobal(toUpperCaseWithUnderscores(name), fullName);
	return fullName;
}

//returns the full name if it exists in the terms map, the give name instead
function getFromTerms(name) {
	if (nameToUri[name]) {
		return nameToUri[name];
	}
	return name;
}

function addToContext(term, value, type) {
	if (!value) {
		value = term;
	}
	value = '"' + currentBase+':'+value + '"';
	simpleContext.push([term, value]);
	if (type) {
		value = '{ "@id": '+ value +', "@type": "'+ type +'" }';
	}
	context.push([term, value]);
}

function addGlobal(name, value) {
	globals.push([name, value]);
}

function toUpperCaseWithUnderscores(string) {
	string = string[0].toLowerCase() + string.substr(1);
	string = string.replace(/[A-Z]/g, function(m){ return '_' + m;});
	return string.toUpperCase();
}

function writeN3ToFile(path) {
	writer.end(function (error, result) {
		fs.writeFile(path, result, function(err) {
			console.log("Saved "+ path);
		});
	});
}

function writeContextToFile(path, context, contextBase) {
	fs.writeFile(path, getContextString(context, contextBase), function(err) {
		console.log("Saved "+ path);
	});
}

function getContextString(context, contextBase) {
	contextString = '{';
	contextString += '\n\t"@context": {';
	contextString += '\n\t\t"@base": "' + contextBase + '"';
	for (var p in prefixes) {
		contextString += ',\n\t\t"' + p + '": "' + prefixes[p] + '"';
	}
	for (var i = 0; i < context.length; i++) {
		contextString += ',\n\t\t"' + context[i][0] + '": ' + context[i][1];
	}
	contextString += '\n\t}';
	contextString += '\n}';
	return contextString;
}

function writeTermDictToFile(path) {
	fs.writeFile(path, "var URI_TO_TERM = "+JSON.stringify(uriToTerm), function(err) {
		console.log("Saved "+ path);
	});
}

function writeGlobalsToFile(path) {
	globalsString = "";
	for (var i = 0; i < globals.length; i++) {
		var key = globals[i][0];
		var value = globals[i][1];
		if (value[0] != '[') {
			value = '"' + value + '"';
		}
		globalsString += 'var ' + key + ' = ' + value + ';\n';
	}
	fs.writeFile(path, globalsString, function(err) {
		console.log("Saved "+ path);
	});
}

function writeContextsToFile(path) {
	contextsString = 'var DYMO_CONTEXT = ' + getContextString(context, contextBase) + '\n\n';
	contextsString += 'var DYMO_SIMPLE_CONTEXT = ' + getContextString(simpleContext, contextBase);
	fs.writeFile(path, contextsString, function(err) {
		console.log("Saved "+ path);
	});
}
