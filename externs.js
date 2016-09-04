var math;
math.parse = function(p1){};
math.expression;
math.expression.node;
/** @constructor */
math.expression.node.OperatorNode = function(p1,p2,p3){};
/** @constructor */
math.expression.node.SymbolNode = function(p1){};

var async;

var $scope;
$scope.prototype.$apply;
var N3;
N3.Parser = function(){};
N3.Store = function(){};
N3.Writer = function(p1){};
N3.Writer.addTriple = function(p1,p2,p3){};
N3.Util;
N3.Util.getLiteralValue = function(p1){};
N3.Util.getLiteralType = function(p1){};
N3.Util.createLiteral = function(p1){};
N3.subject; //otherwise compiler complains when used on result quads
N3.predicate; //otherwise compiler complains when used on result quads
var jsonld;
jsonld.toRDF = function(p1,p2,p3){};
jsonld.fromRDF = function(p1,p2,p3){};

/** @constructor */
function AccelerometerControl(type){};
/** @constructor */
function TiltControl(type){};
/** @constructor */
function CompassControl(){};
/** @constructor */
function GeolocationControl(type){};
/** @constructor */
function DistanceControl(){};
/** @constructor */
function BeaconControl(uuid, major, minor){};