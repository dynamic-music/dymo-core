import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { DymoStore } from './dymostore-service';

export interface JsonGraph {
  nodes: Object[],
  edges: JsonEdge[]
}

export interface JsonEdge {
  source: Object,
  target: Object,
  value: number
}

export class JsonGraphSubject extends BehaviorSubject<JsonGraph> {

  constructor(private nodeClass: string, private edgeProperty: string, private store: DymoStore, private cacheNodes?: boolean) {
    super({nodes:[], edges:[]});
  }

  update() {
    this.store.toJsonGraph(this.nodeClass, this.edgeProperty, this.cacheNodes ? this.getValue() : null)
      .then(graph => this.next(graph));
  }

}