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

const LED_DIMMING = 0x30
const LED_CIRCLE = 0x31
const LED_EMPTY	= 0x32
const LED_ALLCOLORS = 0x33
const LED_PATTERN = 0x34
const COLOR_WHEEL = 0x35
const CLEAN_ALL = 0x36
const LED_RGB = 0x37
const LED_START	= 0x38
const LED_STOP	= 0x39 
const USB_AUDIO = 0x45
var data = new Buffer([0x00, 0x00, 0x00])

var ioctl = require('./ioctl')
const readline = require('readline');

const rl = readline.createInterface(process.stdin, process.stdout);

/**
 * Input command line.
 *
 * @param {string} prompt.
 * @param {callback}{string} handler.
 */
function promptInput(prompt, handler) {
	rl.question(prompt, input => {
		if (handler(input) != false) {
			promptInput(prompt, handler);
		}
		else {
			rl.close();
		}
	});
}

async function LedRGB(red, green, blue) {
	await ioctl.setRGB(LED_RGB, red, green, blue);
	console.log('set color as red: ' + red + ' green: ' + green + ' blue: ' + blue);
}

async function Buffer_LedRingEvent(command, state) {
	switch(command) {
		case LED_DIMMING:
			await ioctl.Transmit(LED_RING, LED_DIMMING, state)
			console.log('LED DIMMING ' + state);
			break;
		case LED_CIRCLE:
			await ioctl.Transmit(LED_RING, LED_CIRCLE, state)
			console.log('LED CIRCLE ' + state);
			break;
		case LED_EMPTY:
			await ioctl.Transmit(LED_RING, LED_EMPTY, state)
			console.log('LED EMPTY ' + state);
			break;
		case LED_ALLCOLORS:
			await ioctl.Transmit(LED_RING, LED_ALLCOLORS, state)
			console.log('LED ALLCOLORS ' + state);
			break;
		case LED_PATTERN:
			await ioctl.Transmit(LED_RING, LED_PATTERN, state)
			console.log('LED PATTERN ' + state);
			break;
		case COLOR_WHEEL:
			await ioctl.Transmit(LED_RING, COLOR_WHEEL, state)
			console.log('LED COLOR WHEEL ' + state);
			break;
		case CLEAN_ALL:
			ioctl.reset()
			setTimeout(async() => {
				await ioctl.Transmit(LED_RING, CLEAN_ALL);
			}, 1000);
			console.log('Led Ring clear effect');
			break;
		case USB_AUDIO:
			await ioctl.Transmit(USER_EVENT, USB_AUDIO);
			console.log('enable usb audio');
			break;
	}
}

async function main() {
	promptInput('Command > ', input => {
		var command, arg, state;
		var index_str = input.indexOf(" ");

		if (index_str >= 0) {
			command = input.slice(0, index_str);
			arg = input.slice(index_str + 1, input.length);
			
			if(arg == 'start') {
				state = LED_START
			}
			else if(arg == "stop") {
				state = LED_STOP
			}
			console.log('state: ' + state);
		}
		else {
			command = input;
		}

		switch(command) {
			case 'dimming':
				Buffer_LedRingEvent(LED_DIMMING, state)
				break;
			case 'circle':
				Buffer_LedRingEvent(LED_CIRCLE, state)
				break;
			case 'empty':
				Buffer_LedRingEvent(LED_EMPTY, state)
				break;
			case 'allcolors':
				Buffer_LedRingEvent(LED_ALLCOLORS, state)
				break;
			case 'pattern':
				Buffer_LedRingEvent(LED_PATTERN, state)
				break;
			case 'colorwheel':
				Buffer_LedRingEvent(COLOR_WHEEL, state)
				break;
			case 'cleanall':
				Buffer_LedRingEvent(CLEAN_ALL)
				break;
			case 'setrgb':
				var words = input.split(' ');
				var red = parseInt(words[1]);
				var green = parseInt(words[2]);
				var blue = parseInt(words[3]);

				LedRGB(red, green, blue)
 				break;
 			case 'usbaudio':
				Buffer_LedRingEvent(USB_AUDIO)
				break;
		}
	})
}

main()








