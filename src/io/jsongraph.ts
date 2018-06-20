import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { JsonGraph, SuperDymoStore } from '../globals/types';

export class JsonGraphSubject extends BehaviorSubject<JsonGraph> {

  constructor(private nodeClass: string, private edgeProperty: string, private store: SuperDymoStore, private cacheNodes?: boolean) {
    super({nodes:[], edges:[]});
  }

  update() {
    this.store.toJsonGraph(this.nodeClass, this.edgeProperty, this.cacheNodes ? this.getValue() : null)
      .then(graph => this.next(graph));
  }

}