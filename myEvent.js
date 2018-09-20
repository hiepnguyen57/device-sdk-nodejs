const I2C_ADDRESS = 0x68;
const LED_RING = 0x00
const MIC_ARRAY = 0x01
const CYPRESS_BUTTON = 0x02
const USER_EVENT = 0x03

const VOLUME_UP = 0x20
const VOLUME_DOWN = 0x21
const VOLUME_MUTE = 0x22
const BT_WAKEWORD_START = 0x23
const WAKE_WORD_STOP = 0x24
const VOLUME_UNMUTE = 0x25
const MICROPHONE_MUTE = 0x26
const MICROPHONE_UNMUTE = 0x27
const WIFI_CONNECTED = 0x40
const WIFI_DISCONNECTED = 0x41

var data = new Buffer([0x00, 0x00, 0x00])

var ioctl = require('./ioctl')
var EventEmitter = require('events').EventEmitter

var BufferEvents = new EventEmitter()

BufferEvents.on('button', (command)=> {
	switch(command) {
		case VOLUME_UP:
			ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UP, 0x06)
			console.log('volume up')
			break;
		case VOLUME_DOWN:
			ioctl.Transmit(CYPRESS_BUTTON, VOLUME_DOWN, 0x03)
			console.log('volume down')
			break;
		case VOLUME_MUTE:
			ioctl.mute()
			ioctl.Transmit(CYPRESS_BUTTON, VOLUME_MUTE)
			console.log('volume mute')
			break;
		case VOLUME_UNMUTE:
			ioctl.unmute()
			ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UNMUTE, 0x02)
			console.log('volume unmute')
			break;
		case MICROPHONE_MUTE:
			ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_MUTE)
			console.log('microphone mute')
			break;
		case MICROPHONE_UNMUTE:
			ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_UNMUTE)
			console.log('microphone unmute')
			break;
		case BT_WAKEWORD_START:
			//recording audio
			console.log('recording')
			break;
	}
})

BufferEvents.on('led ring', (command) => {
	switch(command) {

	}
})

BufferEvents.on('user event', (command) => {
	switch(command)
	{
		case WIFI_CONNECTED:
			ioctl.Transmit(USER_EVENT, WIFI_CONNECTED)
			console.log('wifi was connected')
			break;
		case WIFI_DISCONNECTED:
			ioctl.Transmit(USER_EVENT, WIFI_DISCONNECTED)
			console.log('wifi was disconnected')
			break;
		case WAKE_WORD_STOP:
			ioctl.Transmit(USER_EVENT, WAKE_WORD_STOP)
			console.log('wakeword end')
		case MICROPHONE_MUTE:
			ioctl.Transmit(USER_EVENT, MICROPHONE_MUTE)
			console.log('microphone mute')
			break;
		case MICROPHONE_UNMUTE:
			ioctl.Transmit(USER_EVENT, MICROPHONE_UNMUTE)
			console.log('microphone unmute')
			break;
	}
})

function Controller(target, command) {
	switch(target) {
		case LED_RING:
			BufferEvents.emit('led ring', command)
			break;
		case CYPRESS_BUTTON:
			BufferEvents.emit('button', command)
			break;
		case USER_EVENT:
			BufferEvents.emit('user event', command)
	}
}


BufferEvents.on('i2c event', (target, command) => {
	setImmediate(() => {
		Controller(target, command)

	})
})

module.exports = BufferEvents
