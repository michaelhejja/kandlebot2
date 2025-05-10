export default async function Fibonacci786(strat, tickerData) {

  const zero = strat.variables.find(({ name }) => name === 'Zero')
  const buyAt = strat.strategy.data.buyAt
  const buyPrice = `${zero.value - (zero.value * buyAt)}`
  console.log(`currentPrice: ${tickerData.bestBid}, buyPrice:${buyPrice}`)
}