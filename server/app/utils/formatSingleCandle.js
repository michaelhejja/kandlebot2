import formatDate from "./formatDate"

export default function formatSingleCandle(arr) {
  if (arr.length === 7 ) {
    const output = {
      timeStamp: arr[0],
      timeStampFormatted: formatDate(arr[0] * 1000),
      open: Number(arr[1]),
      close: Number(arr[2]),
      high: Number(arr[3]),
      low: Number(arr[4]),
      volume: Number(arr[5]),
      type: null
    }
    output.color = output.close < output.open ? 'red' : 'green'
    return output
  } else {
    const blank = {
      timeStamp: null,
      timeStampFormatted: null,
      open: null,
      close: null,
      high: null,
      low: null,
      volume: null,
      color: null
    }
    return blank
  }
}