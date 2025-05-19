import formatSingleCandle from "./formatSingleCandle"

export default function formatHistory(array) {
  return array.map(obj => { 
    const candle = formatSingleCandle(obj)
    return candle
  })
}