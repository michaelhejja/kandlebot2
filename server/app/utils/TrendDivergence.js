class TrendDivergence {
  constructor(firstP, firstQ, maxLength = null) {
    this.p = [firstP];
    this.q = [firstQ];
    this.maxLength = maxLength;
  }

  static deltas(arr) {
    const out = [];
    for (let i = 1; i < arr.length; i++) {
      out.push(arr[i] - arr[i-1]);
    }
    return out;
  }

  // Direction-only divergence
  trendDivergence() {
    if (this.p.length < 2) return 0;
    const pd = TrendDivergence.deltas(this.p);
    const qd = TrendDivergence.deltas(this.q);
    let opposite = 0;
    for (let i = 0; i < pd.length; i++) {
      if (pd[i] === 0 && qd[i] === 0) continue;
      if (pd[i] === 0 || qd[i] === 0) {
        opposite += 1;
        continue;
      }
      if (Math.sign(pd[i]) !== Math.sign(qd[i])) {
        opposite += 1;
      }
    }
    const rate = opposite / pd.length;
    return Math.round(rate * 100);
  }

  // Magnitude-based divergence
  magnitudeDivergence() {
    if (this.p.length < 2) return 0;
    const pd = TrendDivergence.deltas(this.p);
    const qd = TrendDivergence.deltas(this.q);
    let num = 0, denom = 0;
    for (let i = 0; i < pd.length; i++) {
      num += Math.abs(pd[i] - qd[i]);
      denom += Math.abs(pd[i]) + Math.abs(qd[i]);
    }
    if (denom === 0) return 0;
    return Math.round(100 * num / denom);
  }

  // Add new value, return both metrics
  nextValue(newP, newQ) {
    this.p.push(newP);
    this.q.push(newQ);
    if (this.maxLength && this.p.length > this.maxLength) {
      this.p.shift();
      this.q.shift();
    }
    return {
      trend: this.trendDivergence(),
      magnitude: this.magnitudeDivergence()
    }
  }
}

export default TrendDivergence