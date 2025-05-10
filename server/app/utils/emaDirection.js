export default function emaDirection(ema20, ema50, ema200) {
  if (ema20 > ema50 && ema50 > ema200) {
    return 2
  } else if (ema20 > ema200 && ema50 < ema200) {
    return 1
  } else if (ema20 < ema50 && ema20 > ema200) {
    return 1
  } else if (ema20 < ema200 && ema20 > ema50) {
    return -1
  } else if (ema20 < ema200 && ema50 > ema200) {
    return -1
  } else if (ema20 < ema50 && ema50 < ema200) {
    return -2
  }
}
