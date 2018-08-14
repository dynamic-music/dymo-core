//Generates the ontologies, context files, and globals files

var fs = require('fs');
var N3 = require('n3');

var rdfPrefix = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
var rdfType = rdfPrefix+"type";

var prefixes = {
	"rdf": rdfPrefix,
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
	"owl": "http://www.w3.org/2002/07/owl#",
	"sch": "http://schema.org/",
	"mo": "http://purl.org/ontology/mo/",
	"mt": "http://purl.org/ontology/studio/multitrack#",
	"ch": "http://tiny.cc/charm-ontology#",
	"dy": "http://tiny.cc/dymo-ontology#",
	"mb": "http://tiny.cc/mobile-audio-ontology#",
	"ex": "http://tiny.cc/expression-ontology#"
};
var contextBase = "http://tiny.cc/dymo-context/";

var writer = N3.Writer({ prefixes:prefixes });
var context = [];
var simpleContext = [];
var uris = [];
var currentBase = "";
var nameToUri = {};
var uriToTerm = {};

initContext();
initUris();
createExpressionOntology("ontologies/expression-ontology.n3");
createDymoOntology("ontologies/dymo-ontology.n3");
createMobileAudioOntology("ontologies/mobile-audio-ontology.n3");
writeContextToFile("ontologies/dymo-context.json", context, contextBase);
writeContextToFile("ontologies/dymo-context-simple.json", simpleContext, contextBase);
writeTermDictToFile("src/globals/terms.ts")
writeUrisToFile("src/globals/uris.ts");
writeContextsToFile("src/globals/contexts.ts");

function initWriter(base) {
	writer = N3.Writer({ prefixes:prefixes });
	currentBase = base;
}

function initContext() {
	currentBase = "rdf";
	addToContext("value");
	currentBase = "sch";
	addToContext("name");
	//mock charm stuff
	currentBase = "ch";
	addToContext("cdt", "cdt", "@vocab");
	addToContext("adt", "adt", "@vocab");
	addToContext("parts", "hasPart");
}

function initUris() {
	addUri("CONTEXT_URI", contextBase);
	addUri("RDFS_URI", prefixes["rdfs"]);
	addUri("EXPRESSION_ONTOLOGY_URI", prefixes["ex"]);
	addUri("DYMO_ONTOLOGY_URI", prefixes["dy"]);
	addUri("MOBILE_AUDIO_ONTOLOGY_URI", prefixes["mb"]);
	//SOME PROPERTIES
	addUri("TYPE", rdfType);
	addUri("FIRST", rdfPrefix+"first");
	addUri("REST", rdfPrefix+"rest");
	addUri("NIL", rdfPrefix+"nil");
	addUri("VALUE", rdfPrefix+"value");
	addUri("DOMAIN", prefixes["rdfs"]+"domain");
	addUri("RANGE", prefixes["rdfs"]+"range");
	addUri("LABEL", prefixes["rdfs"]+"label");
	addUri("NAME", prefixes["sch"]+"name");
	//mock charm stuff
	addUri("CDT", prefixes["ch"]+"cdt");
	addUri("ADT", prefixes["ch"]+"adt");
	addUri("HAS_PART", prefixes["ch"]+"hasPart");
}

function createExpressionOntology(path) {
	initWriter("ex");
	addOntology("An ontology for the representation of logical and mathematical expressions");
	//dymos and dymo types
	addClass("Expression");
	//control this better! (not any expression can be directed, only equations)
	addProperty({term:"directed", iri:"directed", type:"xsd:boolean"}, "Expression", prefixes["xsd"]+"boolean", false);

	addClass("Variable", "Expression");
	addProperty({term:"varName", iri:"varName", type:"xsd:string"}, "Variable", prefixes["xsd"]+"string", false, true);
	addProperty({term:"varType", iri:"varType", type:"@vocab"}, "Variable", prefixes["rdf"]+"Resource", true, true);
	addProperty({term:"varExpr", iri:"varExpr", type:"@vocab"}, "Variable", "Expression", true, true);
	addProperty({term:"varValue", iri:"varValue", type:"@vocab"}, "Variable", prefixes["rdf"]+"Resource", true);

	addClass("Constant", "Expression");

	addClass("Quantifier", "Expression");
	addClass("ForAll", "Quantifier");
	addClass("ThereExists", "Quantifier");
	addProperty({term:"vars", iri:"vars"}, "Quantifier", "Variable", true);
	addProperty({term:"body", iri:"body"}, "Quantifier", "Expression", true);

	addClass("Accessor", "Expression");
	addProperty({term:"object", iri:"object", type:"xsd:string"}, "Accessor", prefixes["xsd"]+"string", false, true);
	addProperty({term:"property", iri:"property", type:"xsd:string"}, "Accessor", prefixes["xsd"]+"string", false, true);

	addClass("FunctionalTerm", "Expression");
	addClass("NamedFunction");//has a sch:name property (string)
	addClass("PropertyFunction");
	addProperty({term:"prop", iri:"prop", type:"@vocab"}, "PropertyFunction", prefixes["rdf"]+"Property", true);
	addUnionClass("Function", ["PropertyFunction", "NamedFunction", "Accessor"]);
	addProperty({term:"func", iri:"func"}, "FunctionalTerm", "Function", true, true);
	addProperty({term:"args", iri:"args"}, "FunctionalTerm", "Variable", true);

	addClass("Conditional", "Expression");
	addProperty({term:"antecedent", iri:"antecedent"}, "Conditional", "Expression", true, true);
	addProperty({term:"consequent", iri:"consequent"}, "Conditional", "Expression", true, true);
	addProperty({term:"alternative", iri:"alternative"}, "Conditional", "Expression", true, true);

	addClass("BinaryOperator", "Expression");
	addProperty({term:"left", iri:"left"}, "BinaryOperator", "Expression", true, true);
	addProperty({term:"right", iri:"right"}, "BinaryOperator", "Expression", true, true);

	addClass("RelationalOperator", "BinaryOperator");
	addClass("EqualTo", "RelationalOperator");
	addClass("NotEqualTo", "RelationalOperator");
	addClass("GreaterThan", "RelationalOperator");
	addClass("LessThan", "RelationalOperator");
	addClass("GreaterThanOrEqualTo", "RelationalOperator");
	addClass("LessThanOrEqualTo", "RelationalOperator");

	addClass("ArithmeticOperator", "BinaryOperator");
	addClass("Addition", "ArithmeticOperator");
	addClass("Subtraction", "ArithmeticOperator");
	addClass("Multiplication", "ArithmeticOperator");
	addClass("Division", "ArithmeticOperator");
	addClass("Power", "ArithmeticOperator");

	writeN3ToFile(path);
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
	addIndividual("Event", "DymoType");
	//parameters, features, and their types
	addClass("Feature", prefixes["ch"]+"Attribute", "A feature is an immutable attribute of a Dymo");
	addClass("Parameter", prefixes["ch"]+"Attribute", "A parameter is a mutable attribute of a Dymo");
	addClass("FeatureType", prefixes["ch"]+"AttributeType");
	addClass("ParameterType", prefixes["ch"]+"AttributeType");
	addProperty({term:"paramType", iri:"hasParameterType", type:"@vocab"}, "Parameter", "ParameterType", true);
	addProperty({term:"featureType", iri:"hasFeatureType", type:"@vocab"}, "Feature", "FeatureType", true);
	addClass("ParameterBehavior");
	addClass("Independent", "ParameterBehavior");
	addClass("Additive", "ParameterBehavior");
	addClass("Multiplicative", "ParameterBehavior");
	addClass("ArithmeticMean", "ParameterBehavior");
	addProperty({term:"behavior", iri:"hasBehavior", type:"@vocab"}, "ParameterType", "ParameterBehavior", true);
	//features
	addIndividual({term:"level", iri:"LevelFeature"}, "FeatureType");
	addIndividual({term:"index", iri:"IndexFeature"}, "FeatureType");
	addIndividual({term:"onset", iri:"OnsetFeature"}, "FeatureType");
	addIndividual({term:"pitch", iri:"PitchFeature"}, "FeatureType");
	addIndividual({term:"duration", iri:"DurationFeature"}, "FeatureType");
	addIndividual({term:"time", iri:"TimeFeature"}, "FeatureType"); //offset
	addIndividual({term:"segmentLabel", iri:"SegmentLabelFeature"}, "FeatureType");
	//audio parameters
	addClass("AudioParameter", "ParameterType");
	addProperty("hasStandardValue", "ParameterType", prefixes["xsd"]+"float", true);
	addProperty("isInteger", "ParameterType", prefixes["xsd"]+"boolean", true);
	addIndividual("Play", "AudioParameter", {"hasStandardValue": 0, "isInteger": true});
	addIndividual("Loop", "AudioParameter", {"hasStandardValue": 0, "isInteger": true});
	addIndividual("Repeat", "AudioParameter", {"hasStandardValue": 0, "isInteger": true});
	addIndividual("Onset", "AudioParameter");
	setProperty("Onset", "hasBehavior", "Additive");
	addIndividual("Duration", "AudioParameter");
	addIndividual("DurationRatio", "AudioParameter", {"hasStandardValue": 1});
	setProperty("DurationRatio", "hasBehavior", "Multiplicative");
	addIndividual("Amplitude", "AudioParameter", {"hasStandardValue": 1});
	setProperty("Amplitude", "hasBehavior", "Multiplicative");
	addIndividual("PlaybackRate", "AudioParameter", {"hasStandardValue": 1});
	setProperty("PlaybackRate", "hasBehavior", "Multiplicative");
	addIndividual("TimeStretchRatio", "AudioParameter", {"hasStandardValue": 1});
	setProperty("TimeStretchRatio", "hasBehavior", "Multiplicative");
	addIndividual("Pan", "AudioParameter", {"hasStandardValue": 0});
	setProperty("Pan", "hasBehavior", "Additive");
	addIndividual("Distance", "AudioParameter", {"hasStandardValue": 0});
	setProperty("Distance", "hasBehavior", "Additive");
	addIndividual("Height", "AudioParameter", {"hasStandardValue": 0});
	setProperty("Height", "hasBehavior", "Additive");
	addIndividual("Reverb", "AudioParameter", {"hasStandardValue": 0});
	setProperty("Reverb", "hasBehavior", "Multiplicative");
	addIndividual("Delay", "AudioParameter", {"hasStandardValue": 0});
	setProperty("Delay", "hasBehavior", "Multiplicative");
	addIndividual("Filter", "AudioParameter", {"hasStandardValue": 20000});
	//structural parameters
	addClass("StructuralParameter", "ParameterType");
	addIndividual("PartCount", "StructuralParameter");
	addIndividual("PartDurationRatio", "StructuralParameter");
	addIndividual("PartProportion", "StructuralParameter");
	//events

	//dymo properties
	addProperty({term:"source", iri:"hasSource", type:"xsd:string"}, "Dymo", prefixes["xsd"]+"string", false);
	addProperty({term:"parameters", iri:"hasParameter", type:"@vocab"}, "Dymo", "Parameter", true);
	addProperty({term:"features", iri:"hasFeature", type:"@vocab"}, "Dymo", "Feature", true);
	addProperty({term:"similars", iri:"hasSimilar"}, "Dymo", "Dymo", true);
	addProperty({term:"successors", iri:"hasSuccessor"}, "Dymo", "Dymo", true);
	addProperty({term:"fst", iri:"hasFirst"}, "Dymo", "Dymo", true);
	addProperty({term:"snd", iri:"hasSecond"}, "Dymo", "Dymo", true);
	//event properties
	addProperty({term:"target", iri:"hasTarget"}, "Event", "Target", true);
	writeN3ToFile(path);
}

function createMobileAudioOntology(path) {
	initWriter("mb");
	addOntology("An ontology for describing renderings of Dynamic Music Objects on mobile devices");
	//main classes
	addClass("Rendering", prefixes["mt"]+"MultitrackProject");
	//addClass("Constraint");
	//control taxonomy
	addClass("MobileControl");
	addClass("SensorControl", "MobileControl");
	addClass("UiControl", "MobileControl");
	addClass("DataControl", "MobileControl");
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
	addClass("SequentialNavigator", "Navigator");
	addClass("SimilarityNavigator", "Navigator");
	addClass("GraphNavigator", "Navigator");
	//rendering and constraints
	addProperty({term:"dymo", iri:"hasDymo", type: "@id"}, "Rendering", "Dymo", true, true);
	addUnionClass("ConstraintOwners", ["Dymo", "Rendering"]);
	addProperty({term:"constraint", iri:"constraint"}, "ConstraintOwners", "Expression", true);
	//control properties
	addProperty({term:"controlParam", iri:"hasControlParam"}, "MobileControl", "MobileParameter", true);
	addProperty({term:"url", iri:"hasUrl", type: "xsd:string"}, "DataControl", prefixes["xsd"]+"string", false);
	addProperty({term:"map", iri:"hasJsonMap", type: "xsd:string"}, "DataControl", prefixes["xsd"]+"string", false);
	addProperty({term:"smooth", iri:"isSmooth", type: "xsd:boolean"}, "SensorControl", prefixes["xsd"]+"boolean", false);
	addProperty({term:"average", iri:"isAverageOf", type: "xsd:integer"}, "SensorControl", prefixes["xsd"]+"integer", false);
	addProperty({term:"uuid", iri:"hasUuid", type: "xsd:string"}, "Beacon", prefixes["xsd"]+"string", false);
	addProperty({term:"major", iri:"hasMajor", type: "xsd:integer"}, "Beacon", prefixes["xsd"]+"integer", false);
	addProperty({term:"minor", iri:"hasMinor", type: "xsd:integer"}, "Beacon", prefixes["xsd"]+"integer", false);
	addProperty({term:"rampDuration", iri:"hasDuration", type: "xsd:integer"}, "Ramp", prefixes["xsd"]+"integer", false);
	//navigator properties
	addProperty({term:"navigators", iri:"hasNavigator"}, "Rendering", "Navigator", false);
	addProperty({term:"dymos", iri:"navDymos"}, "Navigator", "Expression", false);
	writeN3ToFile(path);
}

function addOntology(comment) {
	addTriple(prefixes[currentBase], rdfType, prefixes["owl"]+"Ontology");
	addTriple(prefixes[currentBase], prefixes["rdfs"]+"comment", '"'+comment+'"');
}

function addClass(name, subClassOf, comment) {
	var fullName = addToTermsContextAndUris(name);
	subClassOf = getFromTerms(subClassOf);
	addTriple(fullName, rdfType, prefixes["owl"]+"Class");
	if (subClassOf) {
		addTriple(fullName, prefixes["rdfs"]+"subClassOf", subClassOf);
	}
	addComment(fullName, comment);
}

function addUnionClass(name, classes, comment) {
	var fullName = addToTermsContextAndUris(name);
	addTriple(fullName, rdfType, prefixes["owl"]+"Class");
	classes = classes.map(function(c){ return getFromTerms(c); });
	addTriple(fullName, prefixes["owl"]+"unionOf", writer.list(classes));
	addComment(fullName, comment);
}

/** definition, domain, range, isObjectProperty, isFunctional, comment */
function addProperty(definition, domain, range, isObjectProperty, isFunctional, comment) {
	var fullName = addToTermsContextAndUris(definition);
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
	var fullName = addToTermsContextAndUris(name);
	type = getFromTerms(type);
	addTriple(fullName, rdfType, type);
	for (var p in properties) {
		setProperty(fullName, p, N3.Util.createLiteral(properties[p]));
	}
	addComment(fullName, comment);
}

function setProperty(subject, property, value) {
	addTriple(getFromTerms(subject), getFromTerms(property), getFromTerms(value));
}

function addComment(subject, comment) {
	if (comment) {
		addTriple(subject, prefixes["rdfs"]+"comment", '"'+comment+'"');
	}
}

function addTriple(subject, predicate, object) {
	writer.addTriple({ subject:subject, predicate:predicate, object:object });
}

function addToTermsContextAndUris(definition) {
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
	addUri(toUpperCaseWithUnderscores(name), fullName);
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

function addUri(name, value) {
	uris.push([name, value]);
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
	fs.writeFile(path, "export const URI_TO_TERM = "+JSON.stringify(uriToTerm), function(err) {
		console.log("Saved "+ path);
	});
}

function writeUrisToFile(path) {
	urisString = "";
	for (var i = 0; i < uris.length; i++) {
		var key = uris[i][0];
		var value = uris[i][1];
		if (value[0] != '[') {
			value = '"' + value + '"';
		}
		urisString += 'export const ' + key + ': string = ' + value + ';\n';
	}
	fs.writeFile(path, urisString, function(err) {
		console.log("Saved "+ path);
	});
}

function writeContextsToFile(path) {
	contextsString = 'export const DYMO_CONTEXT = ' + getContextString(context, contextBase) + '\n\n';
	contextsString += 'export const DYMO_SIMPLE_CONTEXT = ' + getContextString(simpleContext, contextBase);
	fs.writeFile(path, contextsString, function(err) {
		console.log("Saved "+ path);
	});
}
