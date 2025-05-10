export default function toIncrement(num, increment) {
  const length = increment.split('.')[1].length
  return Number(num.toFixed(length))
}
