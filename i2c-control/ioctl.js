const i2c = require('i2c-bus');
const gpio = require('onoff').Gpio
//const delay = require('delay')
const pin67 = new gpio(67, 'out')
//const pin66 = new gpio(66, 'out')
var exec = require('child_process').exec
const I2C_ADDRESS = 0x68;
const BUFF_SIZE = 0x03
const CODEC_ADDR = 0x18

var data = new Buffer([0x00, 0x00, 0x00, 0x00]);

const i2c2 = i2c.openSync(2)
const i2c1_forceAccess = i2c.openSync(1, {forceAccess: true})

function pulse() {
	pin67.writeSync(1)
	pin67.writeSync(0)
	//delay(10)
	pin67.writeSync(1)
}

function reset() {
	exec(`echo 0 > /sys/class/gpio/gpio66/value`)
	exec(`echo 1 > /sys/class/gpio/gpio66/value`)
}

function Transmit(target, command, value) {
	//emit pulse before transmission
	pulse()
	//console.log('Sending data to Mic-array');
	data[0] = target
	data[1] = command
	data[2] = value
	i2c2.i2cWriteSync(I2C_ADDRESS, BUFF_SIZE, data, function(err) {
		if (err) {
			reset()
			throw err
		}
	})
}

function mute() {
	//Select Page 1
	data[0] = 0x00
	data[1] = 0x01
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// LOL driver is muted
	data[0] = 0x12
	data[1] = 0x40
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// LOR driver is muted
	data[0] = 0x13
	data[1] = 0x40
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

function unmute() {
	//Select Page 1
	data[0] = 0x00
	data[1] = 0x01
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// LOL driver is not muted
	data[0] = 0x12
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	// LOR driver is not muted
	data[0] = 0x13
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

function setRGB(led, red, green, blue) {
	//create pulse before transmission
	pulse()

	data[0] = led
	data[1] = red
	data[2] = green
	data[3] = blue
	i2c2.i2cWriteSync(I2C_ADDRESS, 0x04, data, function(err) {
		if (err) {
			reset()
			throw err
		}
	})
}

function OutputToSpeaker() {
	//Select Page 1
	data[0] = 0x00
	data[1] = 0x01
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	// Route LDAC/RDAC to LOL/LOR
	data[0] = 0x0e
	data[1] = 0x08
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	data[0] = 0x0f
	data[1] = 0x08
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	// Unmute LOL/LOR driver, 0db Gain
	data[0] = 0x12
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	data[0] = 0x13
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	//Power up LOL/LOR
	data[0] = 0x09
	data[1] = 0x0c
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

function OutputToJack3_5() {
	//Select Page 1
	data[0] = 0x00
	data[1] = 0x01
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	// Route LDAC/RDAC to HPL/HPR
	data[0] = 0x0c
	data[1] = 0x08
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	data[0] = 0x0d
	data[1] = 0x08
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	// Unmute HPL/HPR driver, 0db Gain
	data[0] = 0x10
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
	data[0] = 0x11
	data[1] = 0x00
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})

	//Power up LOL/LOR
	data[0] = 0x09
	data[1] = 0x30
	i2c1_forceAccess.i2cWriteSync(CODEC_ADDR, 0x02, data, function(err) {
		if (err) {
			reset()
			throw err;
		}
	})
}

module.exports = {
	reset: 				reset,
	Transmit: 			Transmit,
	mute: 				mute,
	unmute: 			unmute,
	setRGB: 			setRGB,
	OutputToSpeaker: 	OutputToSpeaker,
	OutputToJack3_5: 	OutputToJack3_5
}