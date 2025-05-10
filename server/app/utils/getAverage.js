export default function getAverage(array) {
  return array.reduce((a, b) => a + b) / array.length
}
