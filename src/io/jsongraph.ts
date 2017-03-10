import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

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

  constructor(private nodeClass, private edgeProperty, private store) {
    super({nodes:[], edges:[]});
  }

  update() {
    this.store.toJsonGraph(this.nodeClass, this.edgeProperty, graph => {
      this.next(graph);
    });
  }

}