import * as math from 'mathjs'
import * as _ from 'lodash'

export class SmithWaterman {

  private matchScore = 3;
  private mismatchScore = -2;
  private gapScore = -1;

  constructor() {}

  run(seq1: number[][], seq2: number[][]) {

    let scoreMatrix = seq1.map(s => seq2.map(t => 0));
    let traceMatrix = seq1.map(s => seq2.map(t => 0));

    seq1.forEach((s1,i) => {
      seq2.forEach((s2,j) => {
        if (i == 0 || j == 0) {
          traceMatrix[i][j] = 3;
        } else {
          let d_last = scoreMatrix[i-1][j-1];
          let u_last = scoreMatrix[i-1][j];
          let l_last = scoreMatrix[i][j-1];
          let d_new = d_last + (_.isEqual(s1, s2) && i != j ? this.matchScore : this.mismatchScore);
          let u_new = u_last + this.gapScore;
          let l_new = l_last + this.gapScore;
          scoreMatrix[i][j] = Math.max(d_new, u_new, l_new, 0);
          let arr = [d_new, u_new, l_new, 0];
          let trace = arr.indexOf(Math.max.apply(Math, arr));
          traceMatrix[i][j] = trace;
        }
      });
    });
    return scoreMatrix;
  }

}