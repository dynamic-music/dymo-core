import * as math from 'mathjs';
import * as u from '../../src/globals/uris';
import * as _ from 'lodash';
import { MathjsNode } from '../globals/types';

export module ExpressionTools {

  let opDefs = [
    ["equal", "==", u.EQUAL_TO, "logic.eq"],
    ["larger", ">", u.GREATER_THAN, "logic.eq"],
    ["smaller", "<", u.LESS_THAN, "logic.less_equal"],
    ["add", "+", u.ADDITION, "logic.add"],
    ["subtract", "-", u.SUBTRACTION, "logic.sub"],
    ["multiply", "*", u.MULTIPLICATION, "logic.mul"],
    ["divide", "/", u.DIVISION, "logic.div"],
    ["unaryMinus", "-", undefined, undefined]
  ];

  let funcToOp = {};
  opDefs.forEach(o => funcToOp[o[0]] = o[1]);

  let funcToUri = {};
  opDefs.forEach(o => funcToUri[o[0]] = o[2] ? o[2] : funcToUri[o[0]]);

  let uriToFunc = _.invert(funcToUri);

  let opToLogicjs = {};
  opDefs.forEach(o => opToLogicjs[o[1]] = o[3] ? o[3] : opToLogicjs[o[1]]);

  export function toUri(mathjsFunction: string): string {
    return funcToUri[mathjsFunction];
  }

  export function toOperatorNode(uri: string, args: MathjsNode[]): MathjsNode {
    return createOperatorNode(uriToFunc[uri], args);
  }

  export function createOperatorNode(nodeType: string, args: MathjsNode[]): MathjsNode {
    return new math.expression.node.OperatorNode(toMathjsOp(nodeType), nodeType, args);
  }

  export function toLogicJsOperatorString(operatorNode: MathjsNode): string {
    return opToLogicjs[operatorNode.op];
  }

  /** weirdly mathjs doesn't seem to offer this */
  function toMathjsOp(mathjsFunc: string): string {
    return funcToOp[mathjsFunc];
  }

}