function Cosiatec() { }

//adds similarity relationships to the subdymos of the given dymo in the given store
Cosiatec.buildHierarchy = function(dymoUri, store) {
  var surfaceDymos = Similarity.getAllParts([dymoUri], store);
  var allPoints = Cosiatec.getQuantizedPoints(surfaceDymos, store);
  var distinctPoints = Cosiatec.getSortedCloneWithoutDupes(allPoints);
  console.log(allPoints.length)
  console.log(JSON.stringify(allPoints));
  var patterns = Cosiatec.getOverlappingCosiatecPatterns(distinctPoints);
  console.log(JSON.stringify(patterns.map(r => r.map(s => s.length))));
  //just take first result for now
  patterns = patterns.slice(0,1);
  var patternDymos = [];
  for (var i = 0; i < patterns.length; i++) {
    var occurrences = patterns[i][1].map(tsl => patterns[i][0].map(p => Cosiatec.round(math.add(p, tsl))));
    var vectorStrings = allPoints.map(v => JSON.stringify(v));
    var dymoUris = occurrences.map(occ => occ.map(p => surfaceDymos[vectorStrings.indexOf(JSON.stringify(p))]));
    var features = store.findAllObjects(dymoUris[0][0], HAS_FEATURE).map(f => store.findObject(f, TYPE));
    for (var j = 0; j < occurrences.length; j++) {
      var currentPatternDymo = store.addDymo((CONTEXT_URI+"pattern"+i)+j, dymoUri);
      patternDymos.push(currentPatternDymo);
      //console.log(dymoUris[j], occurrences[j])
      dymoUris[j].forEach(d => store.addPart(currentPatternDymo, d));
      var avgFeatureVals = dymoUris[j].map(d => features.map(f => store.findFeatureValue(d, f)));
      //remove multidimensional features
      features = features.filter((f,i) => avgFeatureVals[0][i].constructor !== Array);
      avgFeatureVals = avgFeatureVals.map(vs => vs.filter(v => v.constructor !== Array));
      avgFeatureVals = math.mean(avgFeatureVals, 0);
      //console.log(avgFeatureVals);
      avgFeatureVals.forEach((v,k) => store.setFeature(currentPatternDymo, features[k], v));
    }
  }
  store.setParts(dymoUri, patternDymos);
  return patterns;
}

Cosiatec.getQuantizedPoints = function(dymos, store) {
  var points = Similarity.toVectors(dymos, store);
  //normalize some
  //Cosiatec.normalizePoints(points);
  points = Cosiatec.summarizePoints(points);
  //quantize all
  return points.map(p => Cosiatec.round(p));
}

Cosiatec.round = function(point) {
  return point.map(x => Math.round(x * 10) / 10);
}

Cosiatec.normalizePoints = function(points) {
  for (var i = 0; i < points[0].length-2; i++) {
    var max = points.reduce((max,p) => Math.max(max,p[i]), -Infinity);
    var min = points.reduce((max,p) => Math.min(max,p[i]), Infinity);
    points.forEach(p => p[i] = 10*((p[i]-min)/(max-min)));
  }
}

Cosiatec.summarizePoints = function(points) {
  return points.map((p,i) => [
    Cosiatec.indexOfMax(p.slice(0, p.length-2)),
    Math.round(p[p.length-2]),
    i
  ]);
}

Cosiatec.getSortedCloneWithoutDupes = function(array) {
  var clone = removeDuplicates(math.clone(array));
  clone.sort(Cosiatec.compareArrays);
  return clone;
}

//returns an array of pairs of patterns along with their transpositions
//jamie's cosiatec: performs sia only once, returns the best patterns necessary to cover all points
Cosiatec.getOverlappingCosiatecPatterns = function(points) {
  var results = [];
  var patterns = Cosiatec.getSiaPatterns(points);
  patterns = Object.keys(patterns).map(key => patterns[key]);
  var occurrences = Cosiatec.getSiatecOccurrences(points, patterns);
  var compactnesses = Cosiatec.getFlompactness(patterns, points);
  console.log(points.length, patterns.length);
  while (points.length > 0 && patterns.length > 0) {
    var iOfMaxComp = Cosiatec.indexOfMax(compactnesses);
    var involvedPoints = new Set(flattenArrayOnce(occurrences[1][iOfMaxComp]).map(p => JSON.stringify(p)));
    var previousSize = points.length;
    points = points.map(p => JSON.stringify(p)).filter(p => !involvedPoints.has(p)).map(p => JSON.parse(p));
    //only add to results if the pattern includes some points that are in no other pattern
    if (previousSize > points.length) {
      console.log(points.length, patterns.length);
      results.push([patterns[iOfMaxComp], occurrences[0][iOfMaxComp]]);
    }
    patterns.splice(iOfMaxComp, 1);
    occurrences[0].splice(iOfMaxComp, 1);
    occurrences[1].splice(iOfMaxComp, 1);
    compactnesses.splice(iOfMaxComp, 1);
  }
  return results;
}

//returns an array of pairs of patterns along with their transpositions
//original cosiatec: performs sia iteratively on remaining points, returns the best patterns of each step
Cosiatec.getCosiatecPatterns = function(points) {
  var results = [];
  while (points.length > 0) {
    var patterns = Cosiatec.getSiaPatterns(points);
    //get patterns
    patterns = Object.keys(patterns).map(key => patterns[key]);
    //remove single-point patterns
    //patterns = patterns.filter(p => p.length > 1);
    console.log(points.length, patterns.length);
    if (patterns.length > 0) {
      var occurrences = Cosiatec.getSiatecOccurrences(points, patterns);
      var compactnesses = Cosiatec.getFlompactness(patterns, points);
      var iOfMaxComp = compactnesses.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
      results.push([patterns[iOfMaxComp], occurrences[0][iOfMaxComp]]);
      var involvedPoints = new Set(flattenArrayOnce(occurrences[1][iOfMaxComp]).map(p => JSON.stringify(p)));
      points = points.map(v => JSON.stringify(v)).filter(v => !involvedPoints.has(v)).map(v => JSON.parse(v));
    } else {
      break;
    }
  }
  return results;
}

Cosiatec.getSiaPatterns = function(points) {
  var translationTable = Cosiatec.getVectorTable(points);
  //TODO STILL SLOW, OPTIMIZE MORE??
  //var translationList = translationTable.slice(1).reduce((union, tsls) => Cosiatec.uniteSortedArrays(union, tsls), translationTable[0]);
  var translationList = Cosiatec.mergeSortedArrays(translationTable);
  return Cosiatec.getPatterns(translationList);
}

Cosiatec.getSiatecOccurrences = function(points, patterns) {
  var vectorMap = new Map();
  points.forEach((v,i) => vectorMap.set(JSON.stringify(v),i));
  var fullTable = Cosiatec.getFullVectorTable(points);
  var occurrences = patterns.map(pat => pat.map(point => fullTable[vectorMap.get(JSON.stringify(point))]));
  occurrences = occurrences.map(occ => Cosiatec.getIntersection(occ));
  return [occurrences, occurrences.map((occ, i) => occ.map(tsl => patterns[i].map(p => math.add(p, tsl))))];
}

Cosiatec.getCoverage = function(occurrences, numTotalPoints) {
  return occurrences.map(occ => new Set(flattenArrayOnce(occ).map(p => JSON.stringify(p))).size / numTotalPoints);
}

Cosiatec.getFlompactness = function(patterns, allPoints) {
  return patterns.map(pat => pat.length / (1 + Cosiatec.getPointsInBoundingBox(pat, allPoints).length - pat.length));
}

Cosiatec.getCompactness = function(patterns, allPoints) {
  return patterns.map(pat => pat.length / Cosiatec.getPointsInBoundingBox(pat, allPoints).length);
}

Cosiatec.getPointsInBoundingBox = function(pattern, allPoints) {
  var maxes = math.max(pattern, 0);
  var mins = math.min(pattern, 0);
  return allPoints.filter(p => p.every((e,i) => mins[i] <= e && e <= maxes[i]));
}

//takes an array of arrays of vectors and calculates their intersection
Cosiatec.getIntersection = function(vectors) {
  if (vectors.length > 1) {
    var isect = vectors.slice(1).reduce((isect, tsls) => Cosiatec.intersectSortedArrays(isect, tsls), vectors[0]);
    //console.log(JSON.stringify(points), JSON.stringify(isect));
    return isect;
  }
  return vectors[0];
}

//takes two sorted arrays of arrays and returns their union
Cosiatec.uniteSortedArrays = function(a, b) {
  var union = [];
  var i = 0, j = 0, ii = a.length, jj = b.length;
  while (i < ii && j < jj) {
    var c = Cosiatec.compareArrays(a[i], b[j]);
    if (c <= 0) union.push(a[i++]);
    if (c >= 0) union.push(b[j++]);
  }
  while (i < ii) union.push(a[i++]);
  while (j < jj) union.push(b[j++]);
  return union;
}

//takes k sorted arrays and returns their union
Cosiatec.mergeSortedArrays = function(arrays) {
  var union = [];
  var minHeap = new BinaryHeap((a,b) => Cosiatec.compareArrays(a[0], b[0]));
  arrays.forEach((a,i) => a.length > 0 ? minHeap.push([a[0], i, 0]) : null); //push [element, array index, element index]
  while (minHeap.size() > 0) {
    var min = minHeap.pop();
    union.push(min[0]);
    var origin = arrays[min[1]];
    var nextIndex = min[2]+1;
    if (nextIndex < origin.length) {
      minHeap.push([origin[nextIndex], min[1], nextIndex]);
    }
  }
  return union;
}

//takes two sorted arrays of arrays and returns their intersection
Cosiatec.intersectSortedArrays = function(a, b) {
  var isect = [];
  var i = 0, j = 0, ii = a.length, jj = b.length;
  while (i < ii && j < jj) {
    var c = Cosiatec.compareArrays(a[i], b[j]);
    if (c == 0) isect.push(a[i]);
    if (c <= 0) i++;
    if (c >= 0) j++;
  }
  return isect;
}

//compares two arrays lexicographically
Cosiatec.compareArrays = function(a, b) {
  var i = 0, ii = Math.min(a.length, b.length);
  while (i < ii) {
    if (a[i] < b[i]) {
      return -1;
    } else if (a[i] > b[i]) {
      return 1;
    }
    i++;
  }
  return 0;
}

Cosiatec.indexOfMax = function(array) {
  return array.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
}

Cosiatec.getVectorTable = function(points) {
	return points.map((v,i) => points.filter((w,j) => j>i).map(w => [math.subtract(w, v), v]));
}

Cosiatec.getFullVectorTable = function(points) {
	return points.map((v,i) => points.map(w => math.subtract(w, v)));
}

Cosiatec.getPatterns = function(translations) {
  return translations.reduce((grouped, item) => {
    var key = JSON.stringify(item[0]);
    grouped[key] = grouped[key] || [];
    grouped[key].push(item[1]);
    return grouped;
  }, {});
}