import axios from 'axios'

export default function sendSMS(message) {
  console.log('Sending SMS messages')
  console.log(message)
  axios.post('https://textbelt.com/text', {
      phone: encodeURIComponent('+19546824396'),
      message: `${message} | e.g. "Reply STOP to opt-out"`,
      key: 'eef7c8acd30d4b36c51e7e3f395cb8dcb48fd331tTSCgANuO7sKd3cdSI4TB9qLs',
    }).then(response => {
      console.log(response.data)
    })

  // axios.post('https://textbelt.com/text', {
  //     phone: encodeURIComponent('+15307278673'),
  //     message: `${message} | e.g. "Reply STOP to opt-out"`,
  //     key: 'eef7c8acd30d4b36c51e7e3f395cb8dcb48fd331tTSCgANuO7sKd3cdSI4TB9qLs',
  //   }).then(response => {
  //     console.log(response.data)
  //   })
}
