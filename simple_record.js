var record = require('node-record-lpcm16')
var fs = require('fs')
const i2c = require('i2c-bus')
const gpio = require('onoff').Gpio
var ioctl = require('./ioctl')
const gpio48 = new gpio(48, 'in', 'rising', {debounceTimeout: 10})
const moment = require('moment')
var file_name = null
var file = null;


const I2C_ADDRESS = 0x68;
const BUFF_SIZE = 0x02

const CYPRESS_BUTTON = 0x02
const USER_EVENT = 0x03

const BT_WAKEWORD_START = 0x23
const WAKE_WORD_STOP = 0x24

var RxBuff = new Buffer([0x00, 0x00])

const i2c1 = i2c.openSync(1)

function startRecording() {
	file_name = moment().format("YYYYMMDDHHmmss") + '.wav'
	file = fs.createWriteStream(file_name, { encoding: 'binary' })
	record.start({
		sampleRate: 	16000,
		channels: 		1,
		verbose: 		true,
		recordProgram: 	'arecord', // Try also "rec" or "sox"
		device: 		'plughw:1,0',
	})
	.pipe(file)
	console.log('speak now!!!!!');

	// Stop recording after three seconds
	setTimeout(function () {
		record.stop()
		file.end()
		Buffer_UserEvent(WAKE_WORD_STOP)
	}, 3000)
}

/**
 * CTRL+C signal.
 */
process.on('SIGINT', function () {
	process.exit()
});

function event_watcher() {
	gpio48.watch((err) => {
		if (err) {
			throw err;
		}
		//console.log('Receiving data from Mic-array')
		i2c1.i2cReadSync(I2C_ADDRESS, BUFF_SIZE, RxBuff, function(error) {
			if(err) {
				console.log('error transfer');
			}
		})
		BufferController(RxBuff[0], RxBuff[1])
	})
}

function Buffer_UserEvent(command) {
	switch(command) {
		case WAKE_WORD_STOP:
			ioctl.Transmit(USER_EVENT, WAKE_WORD_STOP)
			console.log('wakeword end')
			break;
	}
}

function Buffer_ButtonEvent(command) {
	switch(command) {
		case BT_WAKEWORD_START:
			//recording audio
			console.log('recording!!!!!');
			startRecording()
			break;
	}
}
function BufferController(target, command) {
	switch(target) {
		case CYPRESS_BUTTON:
			Buffer_ButtonEvent(command)
			break;
		case USER_EVENT:
			Buffer_UserEvent(command)
			break;
	}
}
event_watcher()
console.log('push record button to start...');
