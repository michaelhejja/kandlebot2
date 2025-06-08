/*
    __ __                ____     __          __     ___ 
   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \
  / ,< / __  / __ \/ __  / / _ \/ __ \/ __ \/ __/   __/ /
 / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ 
/_/ |_\__,_/_/ /_/\__,_/_/\___/_.___/\____/\__/   /____/ 
THE SNIPER
                                                      ~ambuscade
*/

import KoinTimeline from "./KoinTimeline"

class KoinProcess2 {

  constructor(ID, symbol, API, expressWs, timeStampStart) {
    this.ID = ID
    this.symbol = symbol
    this.API = API
    this.WS = expressWs
    this.timelines = {}

    this.timelines['1min'] = new KoinTimeline(this.symbol, this.API, this.WS, '1min', 1000, timeStampStart)
    this.timelines['1hour'] = new KoinTimeline(this.symbol, this.API, this.WS, '1hour', 400, timeStampStart)
    this.timelines['4hour'] = new KoinTimeline(this.symbol, this.API, this.WS, '4hour', 400, timeStampStart)
    this.timelines['12hour'] = new KoinTimeline(this.symbol, this.API, this.WS, '12hour', 400, timeStampStart)
  }

  async getNextTick() {
    for (const timeline in this.timelines) {
      this.timelines[timeline].getNextTick()
    }
  }

  publishLastKandle() {
    for (const timeline in this.timelines) {
      this.timelines[timeline].publishLastKandle()
    }
  }

  // GETTERS
  get getTimelines() {
    return this.timelines
  }
}

export default KoinProcess2