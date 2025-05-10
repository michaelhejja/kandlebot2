export default function formatDate(date) {
  const typeCast = Number(date)
  const theDate = new Date(typeCast)
  const day = theDate.toLocaleDateString(
    'en-gb',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  )
  const time = theDate.toLocaleTimeString('en-US')
  return `${day} ${time}`
}