export interface FeatureInfo {
  name: string,
  uri: string,
  min: number,
  max: number
}

export interface MathjsNode {
  name: string,
  isOperatorNode: boolean,
  isFunctionNode: boolean,
  isAssignmentNode: boolean,
  isSymbolNode: boolean,
  isConstantNode: boolean,
  value?: number,
  eval: Function,
  transform: Function,
  op?: string
}