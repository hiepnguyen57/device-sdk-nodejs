const moment = require('moment-timezone');
const DEFAULT_PROFILE  = "FAR_FIELD"
const DEFAULT_FORMAT = "AUDIO_L16_RATE_16000_CHANNELS_1"
const DEFAULT_INITIATOR_TYPE = "PRESS_AND_HOLD"
const LOCATION = 'Asia/Ho_Chi_Minh'

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4());
}

function messageGuidGenerator() {
  let date = moment.tz(LOCATION).format("YYYYMMDD")
  let hour = moment.tz(LOCATION).format("HHmmss")
  return "message:" + date + "-" + hour + "-" + guidGenerator()
}

function dialogGuidGenerator() {
  let date = moment.tz(LOCATION).format("YYYYMMDD")
  let hour = moment.tz(LOCATION).format("HHmmss")
  return date + "-" + hour + "-" + guidGenerator()
}

var setSpeechRecognizer = function( onSession, dialogRequestId=null, rawSpeech="", profile=DEFAULT_PROFILE,
                                    format=DEFAULT_FORMAT, initiatorType=DEFAULT_INITIATOR_TYPE,
                                    startWakeWordIndex=0, endWakeWordIndex=0) {
  var messageId = messageGuidGenerator()

  if (dialogRequestId) {
    var dialogRequestId2 = dialogRequestId
  }
  else {
    var dialogRequestId2 = dialogGuidGenerator()
  }
  console.log("messageId is " + messageId)
  console.log("dialogRequestId is " + dialogRequestId2)

  return output = {
    "event": {
      "header":{
        "namespace": "SpeechRecognizer",
        "name": "Recognize",
        "rawSpeech": rawSpeech,
        "messageId": messageId,
        "dialogRequestId": dialogRequestId2,
        "onSession":onSession
      },
      "payload": {
        "profile": profile,
        "format": format,
        "initiator": {
          "type": initiatorType,
          "payload": {
            "wakeWordIndices": {
              "startIndexInSamples": startWakeWordIndex,
              "endIndexInSamples": endWakeWordIndex
            }
          }
        }
      }
    }
  }
}

exports.setSpeechRecognizer       = setSpeechRecognizer
