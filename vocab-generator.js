// Room is rectangular. Consider a floor plan, with positions relative to page:
// Beacons are placed 1/A top-left, 2/B top-centre, 
// 3/C top-right, 4/D bottom-right, 5/E bottom centre, 6/F bottom-right.
// Beacon 3/C is a special case and has more localised sound than the others.
// The "upwards" reference heading is the heading of 2/B compared to magnetic north.

var centerBeaconRange = 0.8; //distance in meters at which the center beacon activates clean mode
var areaBeaconRange = 4; //distance in meters at which the audio associated with the beacon is no longer audible
var areaBeaconClose = 1; // distance in meters up to which audio associated with beacon is full volume
var area3BeaconRange = 1.5; // special case short range for beacon 3
var width = 10; // width of room (left/right) in metres
var depth = 6; // depth of room (top/bottom)
var referenceHeading = 174; // heading of "top-centre" (2/B), degrees

var maxAmplitude = 0.5; //maximum amplitude at which each clip is played back
var uuid = "f7826da6-4fa2-4e98-8024-bc5b71e0893e";
var beacons = [
	{"major":49933,"minor":16629}, // 'centre', SzyX //this one is taken as the center beacon
	{"major":57811,"minor":32951}, // 'A', IXWy //all following ones are assumed to be arranged clockwise
	{"major":63030,"minor":38015}, // 'B', PFZW
	{"major":22570,"minor":15614}, // 'C', 6ipO
	{"major":6286,"minor":31905}, // 'D', Qjrk
	{"major":34762,"minor":8686}, // 'E', 5GOb
	{"major":34015,"minor":52180} // 'F', 3VGI
];
var warpedSoundFiles = [
	"Region1b.m4a",
	"Region2b.m4a",
	null,
	"Region4b.m4a",
	"Region5b.m4a",
	"Region6b.m4a"
];
var cleanSoundFiles = [
	"Region1a.m4a",
	"Region2a.m4a",
	null,
	"Region4a.m4a",
	"Region5a.m4a",
	"Region6a.m4a"
];

//generate dymo
var dymo = {
	"@context":"http://tiny.cc/dymo-context",
	"@id":"beacons",
	"@type":"Dymo",
	"cdt":"parallel",
	"parts":[{
		"@id":"warped",
		"@type":"Dymo",
		"cdt":"parallel",
		"parts":[]

	},{
		"@id":"clean",
		"@type":"Dymo",
		"cdt":"parallel",
		"parts":[],
		"parameters":[
		 		{"@type":"Amplitude", "value":0}
		 ]
	}],
	"mappings":[]
};

for (var i = 0; i < warpedSoundFiles.length; i++) {
	dymo["parts"][0]["parts"].push({
		"@id":"warpedArea"+i,
		"@type":"Dymo",
		"source":warpedSoundFiles[i],
		"parameters":[
			{"@type":"Loop", "value":1},
			{"@type":"Amplitude", "value":maxAmplitude}
		]
	});
	dymo.mappings.push({
		"domainDims":[{"name":"warpedAmplitude","@type":"Parameter"},{"name":"warpedArea"+i+"Amplitude","@type":"Parameter"}],
		"function":{"args":["a","b"],"body":"return a*b;"},
		"dymos":["warpedArea"+i],
		"range":"Amplitude"
	});
}

for (var i = 0; i < cleanSoundFiles.length; i++) {
	if (cleanSoundFiles[i]===null)
		continue;
	dymo["parts"][1]["parts"].push({
		"@id":"cleanArea"+i,
		"@type":"Dymo",
		"source":cleanSoundFiles[i],
		"parameters":[
			{"@type":"Loop", "value":1},
			{"@type":"Amplitude", "value":0}
		]
	});
	// pos
	var y = (i==0 || i==5) ? width/2 : ((i==2 || i==3) ? -width/2 : 0);
	var x = i<=2 ? depth/2 : -depth/2;
	var r = Math.sqrt(x*x+y*y);
	// angles
	var heading = referenceHeading + 360 - Math.atan2(y,x)*180/Math.PI;
	heading = heading-360*Math.floor(heading/360);
	// offset angles
	var closeAngle = Math.atan(areaBeaconClose/r)*180/Math.PI;
	var rangeAngle = Math.atan((i==2 ? area3BeaconRange : areaBeaconRange)/r)*180/Math.PI;
		
	dymo.mappings.push({
		"domainDims":[{"name":"Compass","@type":"Parameter"},{"name":"cleanAmplitude","@type":"Parameter"}],
		"function":{"args":["a","b"],"body":"return b*"+maxAmplitude+"*pwl((a-"+heading+"+180)-360*Math.floor((a-"+heading+"+180)/360)-180, [-"+rangeAngle+",0,-"+closeAngle+",1,"+closeAngle+",1,"+rangeAngle+",0],0);"},
		"dymos":["cleanArea"+i],
		"range":"Amplitude"
	});
}

function smooth(expression, delta, interval) {
	// function tries to smooth result
	return '(function(self) { '+
	'var target = '+expression+'; if(self.smoothCurrent===undefined || Math.abs(target-self.smoothCurrent)<'+delta+')'+
	'{self.smoothCurrent=target; if(self.smoothInterval!==undefined && '+
	'self.smoothInterval!==null){ clearInterval(self.smoothInterval); self.smoothInterval=null; }; } '+
	'else { self.smoothCurrent=Number(self.smoothCurrent)+(target>self.smoothCurrent ? '+delta+' : -'+delta+'); '+
	'/*console.log(\'smooth -> \'+self.smoothCurrent+\' vs \'+target);*/ '+
	'if(self.smoothInterval===undefined || self.smoothInterval===null) {'+
	'self.smoothInterval = setInterval(function() { /*console.log(\'smooth!\');*/ self.updateParameter(); }, '+
	interval+'); }; }; return self.smoothCurrent; })(this);';
}

// can't map to range until it is implicitly created!
dymo.mappings.push({
	"domainDims":[{"name":"Clean","@type":"Parameter"}], //,"smooth":true,"average":3
	"function":{"args":["a"],"body":"return "+smooth("a",0.05,100)+";"},
	"dymos":["beacons"], // "clean"
	"range":"cleanAmplitude" // "Amplitude"
});
dymo.mappings.push({
	"domainDims":[{"name":"Dirty","@type":"Parameter"}], //,"smooth":true,"average":3
	"function":{"args":["a"],"body":"return "+smooth("a",0.05,100)+";"},
	"dymos":["beacons"], // "warped"
	"range":"warpedAmplitude" // "Amplitude"
});

//generate rendering
var rendering = {
	"@context":"http://tiny.cc/dymo-context",
	"@id":"beaconsRendering",
	"@type":"Rendering",
	"dymo":"beacons",
	"mappings":[
	{
		"domainDims":[{
			"name":"compass slider",
			"@type":"Slider",
			"value":0
		}],
		"function":{"args":["a"],"body":"return a*360;"},
		"dymos":["beacons"],
		"range":"Compass"
	},
	{
		"domainDims":[{
			"name":"centre",
			"@type": "Slider",
			"value":0
		}],
		"function":{"args":["a"],"body":"return a;"},
		"dymos":["beacons"],
		"range":"Clean"
	},
	{
		"domainDims":[{
			"name":"edge",
			"@type": "Slider",
			"value":1
		}],
		"function":{"args":["a"],"body":"return a;"},
		"dymos":["beacons"],
		"range":"Dirty"
	}]
};
//add mappings for center beacon

//add mappings for beacon areas
for (var i = 0; i < warpedSoundFiles.length; i++) {
	
	rendering["mappings"].push({
		"domainDims":[{
			"name":"track slider"+i,
			"@type":"Slider",
			"value":0
		}],
		"function":{"args":["a"],"body":"return a;"},
		"dymos":["beacons"], // "warpedArea"+i
		"range":"warpedArea"+i+"Amplitude" // "Amplitude"
	});
}

//write it all to files
var fs = require('fs');
fs.writeFile("www/dymos/beacons/dymo.json", JSON.stringify(dymo, null, '\t'), function(err) {
	console.log("Dymo saved");
});
fs.writeFile("www/dymos/beacons/rendering.json", JSON.stringify(rendering, null, '\t'), function(err) {
	console.log("Rendering saved");
}); 
