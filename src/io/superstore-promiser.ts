import { Fetcher } from '../util/fetcher';
import { AttributeInfo } from '../globals/types';
import { ValueObserver, PartsObserver, JsonGraph, SuperDymoStore,
  ConstraintGhost, BoundVariableGhost } from '../globals/types';
import { SuperStore } from './superstore';

/** This class simply forwards everything to the super store and wraps results
 *  in promises. */
export class SuperStorePromiser implements SuperDymoStore {

  private superStore: SuperStore;

  constructor(fetcher?: Fetcher) {
    this.superStore = new SuperStore();
    if (fetcher) {
      this.superStore.setFetcher(fetcher);
    }
  }

  ////// CONSTRAINT FUNCTIONS ///////

  addConstraint(ownerUri: string, constraint: ConstraintGhost): Promise<string> {
    return Promise.resolve(this.superStore.addConstraint(ownerUri, constraint));
  }

  addVariable(variable: BoundVariableGhost): Promise<string> {
    return Promise.resolve(this.superStore.addVariable(variable));
  }

  activateNewConstraints(constraintUris: string[]): Promise<string[]> {
    return Promise.resolve(this.superStore.activateNewConstraints(constraintUris));
  }

  deactivateConstraints(constraintUris: string[]) {
    return Promise.resolve(this.superStore.deactivateConstraints(constraintUris));
  }



  ////// DYMOSTORE FUNCTIONS ////////

  loadOntologies(localPath?: string): Promise<any> {
    return Promise.resolve(this.superStore.loadOntologies(localPath));
  }

  addBasePath(dymoUri: string, path: string) {
    return Promise.resolve(this.superStore.addBasePath(dymoUri, path));
  }

  addParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): Promise<string> {
    return Promise.resolve(this.superStore.addParameterObserver(dymoUri, parameterType, observer));
  }

  removeParameterObserver(dymoUri: string, parameterType: string, observer: ValueObserver): Promise<string> {
    return Promise.resolve(this.superStore.removeParameterObserver(dymoUri, parameterType, observer));
  }

  addTypeObserver(type: string, observer: ValueObserver) {
    return Promise.resolve(this.superStore.addTypeObserver(type, observer));
  }

  addPartsObserver(dymoUri: string, observer: PartsObserver) {
    return Promise.resolve(this.superStore.addPartsObserver(dymoUri, observer));
  }

  removePartsObserver(dymoUri: string, observer: PartsObserver) {
    return Promise.resolve(this.superStore.removePartsObserver(dymoUri, observer));
  }

  addRendering(renderingUri: string, dymoUri: string) {
    return Promise.resolve(this.superStore.addRendering(renderingUri, dymoUri));
  }

  addDymo(dymoUri: string, parentUri?: string, partUri?: string, sourcePath?: string, type?: string): Promise<string> {
    return Promise.resolve(this.superStore.addDymo(dymoUri, parentUri, partUri, sourcePath, type));
  }

  findTopDymos(): Promise<string[]> {
    return Promise.resolve(this.superStore.findTopDymos());
  }

  findAllObjectsInHierarchy(dymoUri: string): Promise<string[]> {
    return Promise.resolve(this.superStore.findAllObjectsInHierarchy(dymoUri));
  }

  addPart(dymoUri: string, partUri: string): Promise<void> {
    return Promise.resolve(this.superStore.addPart(dymoUri, partUri));
  }

  insertPartAt(dymoUri: string, partUri: string, index: number): Promise<void> {
    return Promise.resolve(this.superStore.insertPartAt(dymoUri, partUri, index));
  }

  removeParts(dymoUri: string, index?: number): Promise<string[]> {
    return Promise.resolve(this.superStore.removeParts(dymoUri, index));
  }

  findParts(dymoUri: string): Promise<string[]> {
    return Promise.resolve(this.superStore.findParts(dymoUri));
  }

  findPartAt(dymoUri, index): Promise<string> {
    return Promise.resolve(this.superStore.findPartAt(dymoUri, index));
  }

  findAllParents(dymoUri: string): Promise<string[]> {
    return Promise.resolve(this.superStore.findAllParents(dymoUri));
  }

  getAllSourcePaths(): Promise<string[]> {
    return Promise.resolve(this.superStore.getAllSourcePaths());
  }

  getSourcePath(dymoUri: string): Promise<string> {
    return Promise.resolve(this.superStore.getSourcePath(dymoUri));
  }

  addControl(name: string, type: string, uri?: string): Promise<string> {
    return Promise.resolve(this.superStore.addControl(name, type, uri));
  }

  setParameter(ownerUri: string, parameterType: string, value?: any): Promise<string> {
    return Promise.resolve(this.superStore.setParameter(ownerUri, parameterType, value));
  }

  findParameterValue(ownerUri: string, parameterType: string): Promise<any> {
    return Promise.resolve(this.superStore.findParameterValue(ownerUri, parameterType));
  }

  addCustomParameter(ownerUri: string, paramType: string): Promise<string> {
    return Promise.resolve(this.superStore.addCustomParameter(ownerUri, paramType));
  }

  setFeature(ownerUri: string, featureType: string, value?: any): Promise<string> {
    return Promise.resolve(this.superStore.setFeature(ownerUri, featureType, value));
  }

  findFeatureValue(ownerUri: string, featureType: string): Promise<any> {
    return Promise.resolve(this.superStore.findFeatureValue(ownerUri, featureType));
  }

  findAttributeValue(ownerUri: string, attributeType: string): Promise<any> {
    return Promise.resolve(this.superStore.findAttributeValue(ownerUri, attributeType));
  }

  setControlParam(controlUri: string, parameterType: string, value: any, observer?: ValueObserver): Promise<string> {
    return Promise.resolve(this.superStore.setControlParam(controlUri, parameterType, value, observer));
  }

  findControlParamValue(controlUri: string, parameterType: string): Promise<any> {
    return Promise.resolve(this.superStore.findControlParamValue(controlUri, parameterType));
  }

  addNavigator(renderingUri: string, navigatorType: string, variableUri: string): Promise<string> {
    return Promise.resolve(this.superStore.addNavigator(renderingUri, navigatorType, variableUri));
  }

  getAttributeInfo(): Promise<AttributeInfo[]> {
    return Promise.resolve(this.superStore.getAttributeInfo());
  }

  findMaxLevel(dymoUri?: string): Promise<number> {
    return Promise.resolve(this.superStore.findMaxLevel(dymoUri));
  }

  toJsonGraph(nodeClass, edgeProperty, previousGraph?: JsonGraph): Promise<JsonGraph> {
    return Promise.resolve(this.superStore.toJsonGraph(nodeClass, edgeProperty, previousGraph));
  }

  uriToJsonld(frameUri: string): Promise<string> {
    return Promise.resolve(this.superStore.uriToJsonld(frameUri));
  }



  ////// EASYSTORE FUNCTIONS /////////

  addValueObserver(subject: string, predicate: string, observer: ValueObserver) {
    return Promise.resolve(this.superStore.addValueObserver(subject, predicate, observer));
  }

  getValueObserverCount(): Promise<number> {
    return Promise.resolve(this.superStore.getValueObserverCount());
  }

  size(): Promise<number> {
    return Promise.resolve(this.superStore.size());
  }

  setValue(subject: string, predicate: string, value: any) {
    return Promise.resolve(this.superStore.setValue(subject, predicate, value));
  }

  findSubject(predicate: string, object: any): Promise<string> {
    return Promise.resolve(this.superStore.findSubject(predicate, object));
  }

  findSubjects(predicate: string, object: any): Promise<string[]> {
    return Promise.resolve(this.superStore.findSubjects(predicate, object));
  }

  findObject(subject: string, predicate: string): Promise<string> {
    return Promise.resolve(this.superStore.findObject(subject, predicate));
  }

  findAllObjects(subject: string, predicate: string): Promise<string[]> {
    return Promise.resolve(this.superStore.findAllObjects(subject, predicate));
  }

  findObjectValue(subject: string, predicate: string): Promise<any> {
    return Promise.resolve(this.superStore.findObjectValue(subject, predicate));
  }

  findAllObjectValues(subject: string, predicate: string): Promise<any[]> {
    return Promise.resolve(this.superStore.findAllObjectValues(subject, predicate));
  }

  isSubclassOf(class1: string, class2: string): Promise<boolean> {
    return Promise.resolve(this.superStore.isSubclassOf(class1, class2));
  }

  recursiveFindAllSubClasses(superclassUri: string): Promise<string[]> {
    return Promise.resolve(this.superStore.recursiveFindAllSubClasses(superclassUri));
  }

  addTriple(subject: string, predicate: string, object: string): Promise<void> {
    return Promise.resolve(this.superStore.addTriple(subject, predicate, object));
  }

  loadData(data: string): Promise<any> {
    return Promise.resolve(this.superStore.loadData(data));
  }

  logData() {
    this.superStore.logData();
  }

}