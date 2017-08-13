export interface AttributeInfo {
  name: string,
  uri: string,
  min: number,
  max: number
}

export interface MathjsNode {
  compile: Function,
  eval: Function,
  transform: Function,

  isParenthesisNode: boolean,
  content?: MathjsNode,

  isFunctionNode: boolean,
  fn?: string,
  args?: MathjsNode[],
  isOperatorNode: boolean,
  op?: string,

  isSymbolNode: boolean,
  name: string,

  isConstantNode: boolean,
  value?: number,

  isAssignmentNode: boolean
}