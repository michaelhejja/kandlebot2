export default function trendScore(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return 0; // Not enough data

  let sumDelta = 0;
  let sumAbsDelta = 0;
  for (let i = 1; i < arr.length; i++) {
    const delta = arr[i] - arr[i-1];
    sumDelta += delta;
    sumAbsDelta += Math.abs(delta);
  }
  if (sumAbsDelta === 0) return 0; // Flat line
  return (sumDelta / sumAbsDelta) * 100;
}