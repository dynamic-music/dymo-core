import { MathjsNode } from './mathjs-types';

export interface Observer {}

export interface PartsObserver extends Observer {
  observedPartsChanged(dymoUri: string): void
}

export interface ValueObserver extends Observer {
  observedValueChanged(uri: string, type: string, value: number): void
}

export interface AttributeInfo {
  name: string,
  uri: string,
  min: number,
  max: number
}

export interface JsonGraph {
  nodes: Object[],
  edges: JsonEdge[]
}

export interface JsonEdge {
  source: Object,
  target: Object,
  value: number
}

/*these ghost types exist so the objects can be passed through a worker
 *as JSON objects, where they lose their functions */
export interface BoundVariableGhost {
  name: string,
  type?: string,
  typeExpressions?: ExpressionGhost[],
  set?: string[]
}

export interface ExpressionGhost {
  expressionString: string,
  mathjsTree: MathjsNode,
  isDirected?: boolean
}

export interface ConstraintGhost {
  vars: BoundVariableGhost[],
  expression: ExpressionGhost
}

export interface SuperDymoStore {
  ////// CONSTRAINT FUNCTIONS ///////
  addConstraint(ownerUri: string, constraint: ConstraintGhost): Promise<string>,
  addVariable(variable: BoundVariableGhost): Promise<string>,
  activateNewConstraints(constraintUris: string[]): Promise<string[]>,
  deactivateConstraints(constraintUris: string[]): Promise<void>,
  getActiveConstraintCount(): Promise<number>,

  ////// DYMOSTORE FUNCTIONS ////////
  loadOntologies(localPath?: string): Promise<any>,
  addBasePath(dymoUri: string, path: string),
  addParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): Promise<string>,
  removeParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): Promise<string>,
  addTypeObserver(type: string, observer: ValueObserver),
  addPartsObserver(dymoUri: string, observer: PartsObserver),
  removePartsObserver(dymoUri: string, observer: PartsObserver),
  addRendering(renderingUri: string, dymoUri: string),
  addDymo(dymoUri: string, parentUri?: string, partUri?: string, sourcePath?: string, type?: string): Promise<string>,
  removeDymo(dymoUri: string): Promise<void>,
  findTopDymos(): Promise<string[]>,
  findAllObjectsInHierarchy(dymoUri: string): Promise<string[]>,
  addPart(dymoUri: string, partUri: string): Promise<void>,
  insertPartAt(dymoUri: string, partUri: string, index: number): Promise<void>,
  removeParts(dymoUri: string, index?: number): Promise<string[]>,
  findParts(dymoUri: string): Promise<string[]>,
  findPartAt(dymoUri, index): Promise<string>,
  findAllParents(dymoUri: string): Promise<string[]>,
  getAllSourcePaths(): Promise<string[]>,
  getSourcePath(dymoUri: string): Promise<string>,
  addControl(name: string, type: string, uri?: string): Promise<string>,
  setParameter(ownerUri: string, parameterType: string, value?: any): Promise<string>,
  findParameterValue(ownerUri: string, parameterType: string): Promise<any>,
  addCustomParameter(ownerUri: string, paramType: string): Promise<string>,
  setFeature(ownerUri: string, featureType: string, value?: any): Promise<string>,
  findFeatureValue(ownerUri: string, featureType: string): Promise<any>,
  findAttributeValue(ownerUri: string, attributeType: string): Promise<any>,
  setControlParam(controlUri: string, parameterType: string, value: any): Promise<string>,
  findControlParamValue(controlUri: string, parameterType: string): Promise<any>,
  addNavigator(renderingUri: string, navigatorType: string, variableUri: string): Promise<string>,
  getAttributeInfo(): Promise<AttributeInfo[]>,
  findMaxLevel(dymoUri?: string): Promise<number>,
  toJsonGraph(nodeClass, edgeProperty, previousGraph?: JsonGraph): Promise<JsonGraph>,
  uriToJsonld(frameUri: string): Promise<string>,

  ////// EASYSTORE FUNCTIONS /////////
  addValueObserver(subject: string, predicate: string, observer: ValueObserver),
  getValueObserverCount(): Promise<number>,
  size(): Promise<number>,
  setValue(subject: string, predicate: string, value: any),
  findSubject(predicate: string, object: any): Promise<string>,
  findSubjects(predicate: string, object: any): Promise<string[]>,
  findObject(subject: string, predicate: string): Promise<string>,
  findAllObjects(subject: string, predicate: string): Promise<string[]>,
  findObjectValue(subject: string, predicate: string): Promise<any>,
  findAllObjectValues(subject: string, predicate: string): Promise<any[]>,
  isSubclassOf(class1: string, class2: string): Promise<boolean>,
  recursiveFindAllSubClasses(superclassUri: string): Promise<string[]>,
  addTriple(subject: string, predicate: string, object: string): Promise<void>,
  loadData(data: string): Promise<any>,
  logData(): void
}