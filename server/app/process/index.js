import { Fibonacci786 } from './strategy'

export default function processStrategy(strat, data) {

  if (strat.strategy.name === 'Fibonacci Retracement (786)') {
    Fibonacci786(strat, data)
  }
}