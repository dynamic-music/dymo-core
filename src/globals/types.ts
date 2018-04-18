export interface Observer {
  observedValueChanged: (paramUri: string, paramType: string, value: number)=>void
}

export interface AttributeInfo {
  name: string,
  uri: string,
  min: number,
  max: number
}

export interface FunctionNode extends MathjsNode {
  fn: FunctionDef
}

export interface FunctionDef extends MathjsNode {}

export interface AccessorNode extends FunctionDef {
  object: string,
  index: string
}

export interface OperatorNode extends MathjsNode {
  fn: string
}

export interface ConditionalNode extends MathjsNode {
  condition: MathjsNode;
  trueExpr: MathjsNode;
  falseExpr: MathjsNode;
}

export interface MathjsNode {
  compile: Function,
  eval: Function,
  transform: Function,

  isParenthesisNode: boolean,
  content?: MathjsNode,

  isFunctionNode: boolean,
  isAccessorNode: boolean,
  isConditionalNode: boolean,
  isOperatorNode: boolean,
  op?: string,
  args: MathjsNode[],

  isSymbolNode: boolean,
  name: string,

  isConstantNode: boolean,
  value?: number,

  isAssignmentNode: boolean
}