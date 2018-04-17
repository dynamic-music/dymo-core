import * as SuperDymoStoreWorker from "worker-loader!./superdymostore-worker";
import * as PromiseWorker from 'promise-worker';
import { Fetcher, FetchFetcher } from '../util/fetcher';
import { JsonGraph } from './jsongraph';
import { AttributeInfo } from '../globals/types';
import { BoundVariable } from '../model/variable';
import { Constraint } from '../model/constraint';

interface Observation {
  observer: {},

}

export class DymoStore {

  private worker: PromiseWorker;
  //TODO RENAME TO OBSERVATION (each observer can observe many things..)
  private observerToKey: Map<{}, number>;
  private keyToObserver: Map<number, {}>;
  private nextKey = 0;

  constructor(fetcher?: Fetcher) {
    this.worker = new PromiseWorker(new SuperDymoStoreWorker());//new Worker(workerPath);
    if (fetcher) {
      this.worker.postMessage({function:'setFetcher', args:[fetcher]});
    }
    this.observerToKey = new Map<{}, number>();
    this.keyToObserver = new Map<number, {}>();
  }



  ////// CONSTRAINT FUNCTIONS ///////

  addConstraint(ownerUri: string, constraint: Constraint): Promise<string> {
    return this.worker.postMessage({function:'addConstraint', args:[ownerUri, constraint]});
  }

  addVariable(variable: BoundVariable): Promise<string> {
    return this.worker.postMessage({function:'addVariable', args:[variable]});
  }

  activateNewConstraints(constraintUris: string[]): Promise<string[]> {
    return this.worker.postMessage({function:'activateNewConstraints', args:[constraintUris]});
  }

  deactivateConstraints(constraintUris: string[]) {
    return this.worker.postMessage({function:'deactivateConstraints', args:[constraintUris]});
  }



  ////// DYMOSTORE FUNCTIONS ////////

  loadOntologies(localPath?: string): Promise<any> {
    return this.worker.postMessage({function:'loadOntologies', args:[localPath]});
  }

  addBasePath(dymoUri: string, path: string) {
    return this.worker.postMessage({function:'addBasePath', args:[dymoUri, path]});
  }

  addParameterObserver(dymoUri: string, parameterType: string, observer: {}) {
    //TODO IMPLEMENT USING POSTMESSAGE....
    const key = this.registerObserver(observer);
    return this.worker.postMessage({function:'addParameterObserver', args:[dymoUri, parameterType, key]});
  }

  removeParameterObserver(dymoUri: string, parameterType: string, observer: {}) {
    const key = this.removeObserver(observer);
    this.worker.postMessage({function:'removeParameterObserver', args:[dymoUri, parameterType, key]});
  }

  addTypeObserver(type: string, predicate: string, observer: {}) {
    //TODO IMPLEMENT USING POSTMESSAGE....
    const key = this.registerObserver(observer);
    return this.worker.postMessage({function:'addTypeObserver', args:[type, predicate, key]});
  }

  addRendering(renderingUri: string, dymoUri: string) {
    return this.worker.postMessage({function:'addRendering', args:[renderingUri, dymoUri]});
  }

  addDymo(dymoUri: string, parentUri?: string, partUri?: string, sourcePath?: string, type?: string): Promise<string> {
    return this.worker.postMessage({function:'addDymo', args:[dymoUri, parentUri, partUri, sourcePath, type]});
  }

  findTopDymos(): Promise<string[]> {
    return this.worker.postMessage({function:'findTopDymos', args:[]});
  }

  findAllObjectsInHierarchy(dymoUri: string): Promise<string[]> {
    return this.worker.postMessage({function:'findAllObjectsInHierarchy', args:[dymoUri]});
  }

  addPart(dymoUri: string, partUri: string): Promise<void> {
    return this.worker.postMessage({function:'addPart', args:[dymoUri, partUri]});
  }

  insertPartAt(dymoUri: string, partUri: string, index: number): Promise<void> {
    return this.worker.postMessage({function:'insertPartAt', args:[dymoUri, partUri, index]});
  }

  removeParts(dymoUri: string, index?: number): Promise<string[]> {
    return this.worker.postMessage({function:'removeParts', args:[dymoUri, index]});
  }

  findParts(dymoUri: string): Promise<string[]> {
    return this.worker.postMessage({function:'findParts', args:[dymoUri]});
  }

  findPartAt(dymoUri, index): Promise<string> {
    return this.worker.postMessage({function:'findPartAt', args:[dymoUri, index]});
  }

  findAllParents(dymoUri: string): Promise<string[]> {
    return this.worker.postMessage({function:'findAllParents', args:[dymoUri]});
  }

  getSourcePath(dymoUri: string): Promise<string> {
    return this.worker.postMessage({function:'getSourcePath', args:[dymoUri]});
  }

  addControl(name: string, type: string, uri?: string): Promise<string> {
    return this.worker.postMessage({function:'addControl', args:[name, type, uri]});
  }

  setParameter(ownerUri: string, parameterType: string, value?: any): Promise<string> {
    return this.worker.postMessage({function:'setParameter', args:[ownerUri, parameterType, value]});
  }

  findParameterValue(ownerUri: string, parameterType: string): Promise<any> {
    return this.worker.postMessage({function:'findParameterValue', args:[ownerUri, parameterType]});
  }

  addCustomParameter(ownerUri: string, paramType: string): Promise<string> {
    return this.worker.postMessage({function:'addCustomParameter', args:[ownerUri, paramType]});
  }

  setFeature(ownerUri: string, featureType: string, value?: any): Promise<string> {
    return this.worker.postMessage({function:'setFeature', args:[ownerUri, featureType, value]});
  }

  findFeatureValue(ownerUri: string, featureType: string): Promise<any> {
    return this.worker.postMessage({function:'findFeatureValue', args:[ownerUri, featureType]});
  }

  setControlParam(controlUri: string, parameterType: string, value: any, observer?: Object): Promise<string> {
    //TODO ADD OBSERVER!!!!!!!!!!
    return this.worker.postMessage({function:'setControlParam', args:[controlUri, parameterType, value, observer]});
  }

  findControlParamValue(controlUri: string, parameterType: string): Promise<any> {
    return this.worker.postMessage({function:'findControlParamValue', args:[controlUri, parameterType]});
  }

  addNavigator(renderingUri: string, navigatorType: string, variableUri: string): Promise<string> {
    return this.worker.postMessage({function:'addNavigator', args:[renderingUri, navigatorType, variableUri]});
  }

  getAttributeInfo(): Promise<AttributeInfo[]> {
    return this.worker.postMessage({function:'getAttributeInfo', args:[]});
  }

  findMaxLevel(dymoUri?: string): Promise<number> {
    return this.worker.postMessage({function:'findMaxLevel', args:[dymoUri]});
  }

  toJsonGraph(nodeClass, edgeProperty, previousGraph?: JsonGraph): Promise<JsonGraph> {
    return this.worker.postMessage({function:'toJsonGraph',
      args:[nodeClass, edgeProperty, previousGraph]});
  }

  uriToJsonld(frameUri: string): Promise<string> {
    return this.worker.postMessage({function:'uriToJsonld', args:[frameUri]});
  }



  ////// EASYSTORE FUNCTIONS /////////

  addValueObserver(subject: string, predicate: string, observer: {}) {
    const key = this.registerObserver(observer);
    return this.worker.postMessage({function:'addValueObserver', args:[subject, predicate, key]});
  }

  getValueObserverCount(): Promise<number> {
    return this.worker.postMessage({function:'getValueObserverCount', args:[]});
  }

  size(): Promise<number> {
    return this.worker.postMessage({function:'size', args:[]});
  }

  setValue(subject: string, predicate: string, value: any) {
    return this.worker.postMessage({function:'setValue', args:[subject, predicate, value]});
  }

  findSubject(predicate: string, object: any): Promise<string> {
    return this.worker.postMessage({function:'findSubject', args:[predicate, object]});
  }

  findSubjects(predicate: string, object: any): Promise<string[]> {
    return this.worker.postMessage({function:'findSubjects', args:[predicate, object]});
  }

  findObject(subject: string, predicate: string): Promise<string> {
    return this.worker.postMessage({function:'findObject', args:[subject, predicate]});
  }

  findAllObjects(subject: string, predicate: string): Promise<string[]> {
    return this.worker.postMessage({function:'findAllObjects', args:[subject, predicate]});
  }

  findObjectValue(subject: string, predicate: string): Promise<any> {
    return this.worker.postMessage({function:'findObjectValue', args:[subject, predicate]});
  }

  isSubclassOf(class1: string, class2: string): Promise<boolean> {
    return this.worker.postMessage({function:'isSubclassOf', args:[class1, class2]});
  }

  recursiveFindAllSubClasses(superclassUri: string): Promise<string[]> {
    return this.worker.postMessage({function:'recursiveFindAllSubClasses', args:[superclassUri]});
  }

  addTriple(subject: string, predicate: string, object: string): Promise<void> {
    return this.worker.postMessage({function:'addTriple', args:[subject, predicate, object]});
  }

  loadData(data: string): Promise<any> {
    return this.worker.postMessage({function:'loadData', args:[]});
  }



  ////// PRIVATE FUNCTIONS

  /**registers an observer and returns the new key*/
  private registerObserver(observer: {}): number {
    const key = this.nextKey++;
    this.observerToKey.set({}, key);
    this.keyToObserver.set(key, {});
    return key;
  }

  /**removes an observer and returns its key*/
  private removeObserver(observer: {}): number {
    const key = this.observerToKey.get(observer);
    this.observerToKey.delete({});
    this.keyToObserver.delete(key);
    return key;
  }

}