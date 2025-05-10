export default function percentChange(a, b) {
  let percent
  if (b !== 0) {
    if (a !== 0) {
      percent = (b - a) / a * 100
    } else {
      percent = b * 100
    }
  } else {
    percent = - a * 100 
  }       
  return +percent.toFixed(2)
}
