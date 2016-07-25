//Generates the ontologies, context files, and globals files

var fs = require('fs');
var N3 = require('n3');

var rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

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
var globals = [];
var currentBase = "";
var currentTerms = {};

initContext();
createDymoOntology("ontologies/test/dymo-ontology.n3");
createMobileAudioOntology("ontologies/test/mobile-audio-ontology.n3");
writeContextToFile("ontologies/test/dymo-context.json");
writeGlobalsToFile("ontologies/test/globals.js");

function initWriter(base) {
	writer = N3.Writer({ prefixes:prefixes });
	currentBase = base;
}

function initContext() {
	currentBase = "sch";
	addToContext("name");
	currentBase = "ch";
	addToContext("cdt", "cdt", "@vocab");
	addToContext("adt", "adt", "@vocab");
	addToContext("value");
	addToContext("parts", "hasPart");
}

function createDymoOntology(path) {
	initWriter("dy");
	addOntology("An ontology for describing Dynamic Music Objects");
	//main classes
	addClass("Dymo", prefixes["ch"]+"Constituent", "A Dynamic Music Object is a hierarchical structure of musical objects with modifiable parameters");
	addClass("Feature", prefixes["ch"]+"Attribute", "A feature is an immutable attribute of a Dymo");
	addClass("Parameter", prefixes["ch"]+"Attribute", "A parameter is a mutable attribute of a Dymo");
	//dymo types
	addClass("DymoType", prefixes["ch"]+"ConstituentType");
	addIndividual("Conjunction", "DymoType");
	addIndividual("Disjunction", "DymoType");
	addIndividual("Sequence", "DymoType");
	//TODO REMOVE SOON
	addToContext("parallel", "Conjunction");
	//audio parameters
	addClass("AudioParameter", "Parameter");
	addClass("Play", "AudioParameter");
	addClass("Loop", "AudioParameter");
	addClass("Onset", "AudioParameter");
	addClass("Amplitude", "AudioParameter");
	addClass("PlaybackRate", "AudioParameter");
	addClass("Pan", "AudioParameter");
	addClass("Distance", "AudioParameter");
	addClass("Reverb", "AudioParameter");
	addClass("Delay", "AudioParameter");
	addClass("Filter", "AudioParameter");
	//structural parameters
	addClass("StructuralParameter", "Parameter");
	addClass("PartCount", "StructuralParameter");
	addClass("PartDurationRatio", "StructuralParameter");
	addClass("PartProportion", "StructuralParameter");
	//properties
	addProperty({term:"source", iri:"hasSource", type:"xsd:string"}, "Dymo", prefixes["xsd"]+"string", false);
	addProperty({term:"parameters", iri:"hasParameter", type:"@vocab"}, "Dymo", "Parameter", false);
	addProperty({term:"features", iri:"hasFeature", type:"@vocab"}, "Dymo", "Feature", false);
	
	writeN3ToFile(path);
}

function createMobileAudioOntology(path) {
	initWriter("mb");
	addOntology("An ontology for describing renderings of Dynamic Music Objects on mobile devices");
	//main classes
	addClass("Rendering", prefixes["mt"]+"MultitrackProject");
	addClass("Mapping");
	addClass("DomainDimension");
	addClass("Function");
	//control taxonomy
	addClass("MobileControl");
	addClass("CustomControl", "MobileControl");
	addClass("SensorControl", "MobileControl");
	addClass("UIControl", "MobileControl");
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
	//ui controls
	addClass("Slider", "UIControl");
	addClass("Toggle", "UIControl");
	addClass("Button", "UIControl");
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
	
	//TODO NAVIGATORS!!
	
	//properties
	addProperty({term:"dymo", iri:"hasDymo"}, "Rendering", "Dymo", true, true);
	addProperty({term:"mappings", iri:"hasMapping"}, "Rendering", "Mapping", true);
	addProperty({term:"domainDims", iri:"hasDomainDimension"}, "Mapping", "DomainDimension", true);
	addProperty("fromControl", "DomainDimension", "MobileControl", true);
	addProperty("fromFeature", "DomainDimension", "Feature", true);
	addProperty("fromParameter", "DomainDimension", "Parameter", true);
	addProperty({term:"function", iri:"hasFunction"}, "DomainDimension", "Function", true);
	addProperty({term:"args", iri:"hasArgument"}, "Function", prefixes["xsd"]+"string", false);
	addProperty({term:"body", iri:"hasBody"}, "Function", prefixes["xsd"]+"string", false);
	addProperty({term:"dymos", iri:"toDymo", type: "@id"}, "Mapping", "Dymo", true);
	addProperty({term:"targets", iri:"toTarget"}, "Mapping", "MobileControl", true);
	addProperty({term:"range", iri:"toParameter", type: "@vocab"}, "Mapping", "Parameter", true);
	addProperty({term:"smooth", iri:"isSmooth", type: "xsd:boolean"}, "SensorControl", prefixes["xsd"]+"boolean", false);
	addProperty({term:"average", iri:"isAverageOf", type: "xsd:integer"}, "SensorControl", prefixes["xsd"]+"integer", false);
	
	writeN3ToFile(path);
}

function addOntology(comment) {
	addTriple(prefixes[currentBase], rdfType, prefixes["owl"]+"Ontology");
	addTriple(prefixes[currentBase], prefixes["rdfs"]+"comment", comment);
}

function addClass(name, subClassOf, comment) {
	var fullName = addToTermsContextAndGlobals(name);
	subClassOf = getFromTerms(subClassOf);
	addTriple(fullName, rdfType, prefixes["owl"]+"Class");
	if (subClassOf) {
		addTriple(fullName, prefixes["rdfs"]+"subClassOf", subClassOf);
	}
	if (comment) {
		addTriple(fullName, prefixes["rdfs"]+"comment", comment);
	}
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
	addTriple(fullName, prefixes["rdfs"]+"range", range);
	if (comment) {
		addTriple(fullName, prefixes["rdfs"]+"comment", comment);
	}
}

function addIndividual(name, type, comment) {
	var fullName = addToTermsContextAndGlobals(name);
	type = getFromTerms(type);
	addTriple(prefixes[currentBase]+name, rdfType, type);
	if (comment) {
		addTriple(prefixes[currentBase]+name, prefixes["rdfs"]+"comment", comment);
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
	currentTerms[name] = fullName;
	addGlobal(name.toUpperCase(), fullName);
	return fullName;
}

//returns the full name if it exists in the terms map, the give name instead
function getFromTerms(name) {
	if (currentTerms[name]) {
		return currentTerms[name];
	}
	return name;
}

function addToContext(term, value, type) {
	if (!value) {
		value = term;
	}
	value = '"' + currentBase+':'+value + '"';
	if (type) {
		value = '{ "@id": '+ value +', "@type": "'+ type +'" }';
	}
	context.push([term, value]);
}

function addGlobal(name, value) {
	globals.push([name, value]);
}

function writeN3ToFile(path) {
	writer.end(function (error, result) {
		fs.writeFile(path, result, function(err) {
			console.log("Saved "+ path);
		});
	});
}

function writeContextToFile(path) {
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
	fs.writeFile(path, contextString, function(err) {
		console.log("Saved "+ path);
	});
}

function writeGlobalsToFile(path) {
	globalsString = "";
	for (var i = 0; i < globals.length; i++) {
		globalsString += 'var ' + globals[i][0] + ' = "' + globals[i][1] + '";\n';
	}
	fs.writeFile(path, globalsString, function(err) {
		console.log("Saved "+ path);
	});
}



/*fs.writeFile("www/dymos/beacons/rendering.json", JSON.stringify(rendering, null, '\t'), function(err) {
	console.log("Rendering saved");
});*/
