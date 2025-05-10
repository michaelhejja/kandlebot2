class Market {
  
  constructor(market, datafeed) {
    this.market = market
    this.datafeed = datafeed

    this.subscribe()
  }

  subscribe() {
    const topic = `/market/snapshot:${this.market}`
    const callbackId = this.datafeed.subscribe(topic, (message) => {
      if (message.topic === topic) {
        this.process(message.data)
      }
    })
  }

  unsubscribe() {
    const topic = `/market/snapshot:${this.market}`
    this.datafeed.unsubscribe(topic)
  }

  process(data) {
    console.log(data.data)
    // this.unsubscribe()
    // const volumes = data.map(obj => {
    //   return obj.data.vol
    // })
    // const maxVolume = Math.max(...volumes)
    // console.log(`Max volume: ${maxVolume}`)
  }
}

export default Market