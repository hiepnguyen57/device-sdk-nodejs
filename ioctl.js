const i2c = require('i2c-bus');
const gpio = require('onoff').Gpio
const delay = require('delay')
const pin67 = new gpio(67, 'out')
//const pin66 = new gpio(66, 'out')
var execFile = require('child_process').execFile
const I2C_ADDRESS = 0x68;
const BUFF_SIZE = 0x03
const CODEC_ADDR = 0x18

var data = new Buffer([0x00, 0x00, 0x00, 0x00]);

const i2c1 = i2c.openSync(1)
const i2c1_forceAccess = i2c.openSync(1, {forceAccess: true})

function pulse() {
	pin67.writeSync(1)
	pin67.writeSync(0)
	delay(10)
	pin67.writeSync(1)
}

function reset() {
	execFile('/bin/bash', ['/home/root/reset.sh'], function(err, stdout, stderr) {
		if (err) {
			console.log('exec error:', err);
		}
	})
}

function Transmit(target, command, value) {
	//create pulse before transmission
	pulse()
	//console.log('Sending data to Mic-array');
	data[0] = target
	data[1] = command
	data[2] = value
	i2c1.i2cWriteSync(I2C_ADDRESS, BUFF_SIZE, data, function(err) {
		if (err) {
			reset()
			throw err
		}
	})
}

function mute() {
	//Select Page 0
	data[0] = 0x00
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// Mute LDAC/RDAC
	data[0] = 0x40
	data[1] = 0x0C
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

function unmute() {
	//Select Page 0
	data[0] = 0x00
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// Unmute LDAC/RDAC
	data[0] = 0x40
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

function setRGB(object, red, green, blue) {
	//create pulse before transmission
	pulse()

	data[0] = object
	data[1] = red
	data[2] = green
	data[3] = blue
	i2c1.i2cWriteSync(I2C_ADDRESS, 0x04, data, function(err) {
		if (err) {
			reset()
			throw err
		}
	})
}

module.exports = {
	reset: 				reset,
	Transmit: 			Transmit,
	mute: 				mute,
	unmute: 			unmute,
	setRGB: 			setRGB
}