'use strict';
/* Library -------------------------------------------------------------------*/
const readline = require('readline');
const rl = readline.createInterface(process.stdin, process.stdout);
const path = require('path');
const config = require('./config.json');
const util = require('util');
const BinaryClient = require('binaryjs').BinaryClient;
const eventGenerator = require('./event');
const lame = require('lame');
const Speaker = require('speaker');
const event = require('events');
const recordingStream = require('node-record-lpcm16');
/* Imports the Google Cloud client library */
const speech = require('@google-cloud/speech');
const current_path = require('path').dirname(require.main.filename);
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = `${current_path}/credentials.json`;

var rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.join(__dirname, './gd_bundle-g2-g1.crt'));

/* will work with all https requests will all libraries (i.e. request.js) */
require('https').globalAgent.options.ca = rootCas;

/* for SpeechRecognizer.ExpectSpeech */
var onSession = false;
var dialogRequestId = null;
var lastInitiator = null;

var mic_options = {
	encoding: 'LINEAR16',
	sampleRateHertz: 16000,
	languageCode: 'vi-VN'// 'vi-VN' 'en-US'
}

/* Create the Speaker instance */
var audioOptions = {
	channels: 2,
	bitDepth: 16,
	sampleRate: 44100,
 	mode: lame.STEREO,
 	//device: 'hw:0,0'
};

/* Creates a client */
const speech_client = new speech.SpeechClient();

const exec = require("child_process").exec;
const i2c = require('i2c-bus')
const gpio = require('onoff').Gpio
var ioctl = require('./ioctl')
const Audio = require('audio')

// Export gpio48 as an interrupt generating input with a debounceTimeout of 10
const gpio48 = new gpio(48, 'in', 'rising', {debounceTimeout: 10})

const I2C_ADDRESS = 0x68;
const BUFF_SIZE = 0x02
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
const RECORD_ERROR = 0x42
const BLE_ON = 0x43
const BLE_OFF = 0x44
const USB_AUDIO = 0x45
const CLIENT_ERROR = 0x46

const LED_DIMMING = 0x30
const LED_CIRCLE = 0x31
const LED_EMPTY	= 0x32
const LED_ALLCOLORS = 0x33
const LED_PATTERN = 0x34
const COLOR_WHEEL = 0x35
const CLEAN_ALL = 0x36
const LED_START	= 0x38
const LED_STOP	= 0x39 

var RxBuff = new Buffer([0x00, 0x00])

const i2c1 = i2c.openSync(1)
var fs = require('fs')
var fifo = require('fifo')()
var audio_data = null
var file_record = null
//var file_stream = null
var clientIsOnline

var client = new BinaryClient('wss://chatbot.iviet.com:4433');
var clientStream;
var recognizeStream;
var isRecording = false;

var music_manager = require('./music_player').getMusicManager()
const bluetooth_discoverable = require('./bluetooth').bluetooth_discoverable
const bluetooth_init = require('./bluetooth').bluetooth_init
const events = require('./music_player').events
const amixer = require('./amixer')
var bluez_event = require('./bluetooth').bluez_event
var bluealsa_aplay_connect = require('./bluetooth').bluealsa_aplay_connect
var bluealsa_aplay_disconnect = require('./bluetooth').bluealsa_aplay_disconnect
/* Private function ----------------------------------------------------------*/
/**
 * After getting the wake word, this function will stream audio recording to server.
 *
 * @param {object} eventJSON.
 */
async function startStream(eventJSON) {
	//fading volume
	//music_manager.eventsHandler(events.FadeInVolume)

	//file_record = fs.createWriteStream('recorded.wav', { encoding: 'binary' })
	//file_stream = fs.createWriteStream('streaming.wav', { encoding: 'binary'});

	if(clientIsOnline === true){
		console.log('online')
		clientStream = client.createStream(eventJSON)
	}
	else {
		console.log('offline')
		return
	}

	const request = {
	    config: {
	        encoding: mic_options.encoding,
	        sampleRateHertz: mic_options.sampleRateHertz,
	        languageCode: mic_options.languageCode,
	    },
	    interimResults: true, /* If you want interim results, set this to true */
	    singleUtterance: false
	};

	/* Create a recognize stream */
	recognizeStream = speech_client
	    .streamingRecognize(request)
	    .on('error', (err) => {
	        console.log('google speech: ' + err);
	    })
	    .on('data', (data) => {
	    })
	    .on('end', () => {
	        console.log('end google speech');
	        stopStream();
	    })

	var streamToServer = recordingStream
		.start({
			sampleRate: 	16000,
			channels: 		2,
			verbose: 		false,
			recordProgram: 	'arecord', // Try also "rec" or "sox"
			device: 		'plughw:1',
		})
		// remove comment if you want to save streaming file
		// .on('data', function(chunk) {
		//     fifo.push(chunk);
		//     var cache_length = fifo.length;
		//     for(var i = 0; i < cache_length; i++){
		//         var tmp = fifo.shift();
		//         if(tmp != null){
		//             console.log(tmp.length)
		//             if(file_stream != null){
		//                 file_stream.write(tmp);
		//             }
		//         }
		//     }
		//     fifo.clear()
		// })
		.on('error', (err) => {
			console.log(err);
		})
		.on('end', () => {
			console.log('end recording');
		})

	streamToServer.pipe(clientStream);
	//streamToServer.pipe(file_record);// remove comment if you want to save recording file
    streamToServer.pipe(recognizeStream);
	console.log("Speak now!!!");

	setTimeout(function () {
		console.log('Timeout recording!!!!');
		stopStream();
	}, 5000)
}

/**
 * Stop streaming when end of sentence
 *
 * @param {}
 */
function stopStream() {
	// if(file_stream != null){
	// 	file_stream.end()
	// 	file_stream = null
	// 	file_record = null
	// }
	if(clientIsOnline === true){
		console.log('stop stream');
		//send end of sentence to mic-array
		Buffer_UserEvent(WAKE_WORD_STOP)

		music_manager.eventsHandler(events.FadeOutVolume)
		recordingStream.stop();
        recognizeStream.end();
		clientStream.end();
		isRecording = false
	}
}

client.on("open", () => {
	console.log('client has opened');
	clientIsOnline = true
})

client.on("pong", (data, flags) => {
	console.log("PONG received")
})

client.on("error", (error) => {
	console.log('client got an error');
	clientIsOnline = false
});

async function webPlayNewSong(serverStream, url)
{
	serverStream.on('data', function(url) {
		var intro_url = 'http://chatbot.iviet.com' + url
		console.log(intro_url);
		exec(`./playurl ${intro_url}`)
	})
	music_manager.url = url
	music_manager.eventsHandler(events.W_NewSong)
}

function playStream(serverStream) {
	console.log('play stream event');
	// var speaker = new Speaker(audioOptions);
	// var decoder = lame.Decoder()
	// decoder.pipe(speaker)

 	//serverStream.pipe(file_sorry);
	serverStream.on('data', function(url) {
		console.log('url ' + url);
		//serverStream.pipe(decoder);
 	})
}
/**
 * Receiving directive and streaming source from server to this client after streamed audio recording to server.
 *
 * @resource : event from server.
 * @param {object} serverStream : streaming audio from server.
 * @param {object} directive : use to switch context and control the devices.
 */
client.on("stream", async (serverStream, directive) => {
	console.log("Server Meta is " + JSON.stringify(directive));
	console.log("Client <--> Backend total response time");
	console.log(`${directive.header.namespace} == ${directive.header.name} == ${directive.payload.format} == ${directive.header.rawSpeech} \
	== ${directive.card == null ? directive.card : directive.card.cardOutputSpeech}`)

	if (directive.header.name == "Recognize" && directive.payload.format == "AUDIO_L16_RATE_16000_CHANNELS_1") {
		// var musicResume = false
		// if(music_manager.isMusicPlaying == true) {
		// 	music_manager.eventsHandler(events.Pause)
		// 	musicResume = true
		// }

		reset_micarray()
		console.log('xin loi eo ghi am duoc!!!');
		// exec(`aplay ${current_path}/Sounds/${'donthearanything.wav'}`).on('exit', function(code, signal) {
		// 	if(musicResume == true) {
		// 			music_manager.eventsHandler(events.Resume)
		// 	}
		// })
	}

	if (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Empty") {
		onSession = true;
		dialogRequestId = directive.header.dialogRequestId;
		lastInitiator = directive.payload.initiator;
		return
	}

	/**
	 * Playing music.
	 */
	if (directive.header.namespace == "AudioPlayer" && directive.header.name == "Play") {
		const url = directive.payload.audioItem.stream.url;
		console.log("Playing song at url: " + JSON.stringify(directive.payload));
		await webPlayNewSong(serverStream, url)
		return
	}

	/**
	 * Pause music.
	 */
	if (directive.header.namespace == "PlaybackController" && directive.header.name == "PauseCommandIssued") {
		console.log('Pause command');
		music_manager.eventsHandler(events.Pause)
		return
	}

	/**
	 * Resume music.
	 */
	if (directive.header.namespace == "PlaybackController" && directive.header.name == "ResumeCommandIssued") {
		console.log('Resume Command');
		music_manager.eventsHandler(events.Resume)
		return
	}

	if (directive.header.namespace == "Alerts" && directive.header.name == "SetAlert") {
			playStream(serverStream)
	}

	/**
	 * Volume adjust.
	 */
	if (directive.header.namespace == "Speaker") {
		if (directive.header.name == "AdjustVolume") {
			if (directive.payload.volume >= 0) {
				Buffer_ButtonEvent(VOLUME_UP)
			}
			else {
				Buffer_ButtonEvent(VOLUME_DOWN)
			}
		}

		/* Volume Mute. */
		if (directive.header.name == "SetMute") {
			if (directive.payload.mute == true)
			{
				/* Mute */
				Buffer_ButtonEvent(VOLUME_MUTE)
			}
			else {
				/* Unmute */
				Buffer_ButtonEvent(VOLUME_UNMUTE)
			}
		}
		return
	}

	/**
	 * Opening bluetooth.
	 */
	if (directive.header.namespace == "Bluetooth") {
		var musicResume = false
		if(music_manager.isMusicPlaying == true) {
			music_manager.eventsHandler(events.Pause)
			musicResume = true
		}

		if (directive.header.name == "ConnectByDeviceId") {
			await bluetooth_discoverable('on')
			exec(`aplay ${current_path}/Sounds/${'bluetooth_connected_322896.wav'}`)
			Buffer_UserEvent(BLE_ON)
		}
		else if (directive.header.name == "DisconnectDevice") {
			await bluetooth_discoverable('off')
			Buffer_UserEvent(BLE_OFF)
		}
		setTimeout(() => {
			if(musicResume == true) {
				music_manager.eventsHandler(events.Resume)
			}
		}, 500);

		return
	}

	/* PUT this at last to avoid earlier matching */
	if ((directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "ExpectSpeech")
		|| (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Speak")) {
			console.log("SpeechSynthesizer only Playing Stream below")
			playStream(serverStream);
		return
	}
});

/**
 * When quit app need to do somethings.
 */
async function quit() {
	await bluetooth_discoverable('off')
	process.exit()
}

/**
 * CTRL+C signal.
 */
process.on('SIGINT', function () {
	quit();
});


function event_watcher() {
	gpio48.watch(async(err, value) => {
		if (err) {
			throw err;
		}
		return new Promise((resolve, reject) => {
			//console.log('Receiving data from Mic-array')
			i2c1.i2cReadSync(I2C_ADDRESS, BUFF_SIZE, RxBuff, function(error) {
				if(err) {
					ioctl.reset()
					return reject(err)
				}
			})
			BufferController(RxBuff[0], RxBuff[1])
			resolve()
		})
	})
}

/**
 * Main
 *
 * @param {} ();
 */
async function main() {
	exec(`/home/root/line_amp.sh`).on('exit', async() => {
		setTimeout(async() => {
			await amixer.volume_control('setvolume 40')
		}, 1000);
	})

	reset_micarray()

	require('dns').resolve('www.google.com', async(err) => {
		if(err) {
			console.log('No connection');
			//play audio notification here
			setTimeout(() => {
				exec(`aplay ${current_path}/Sounds/${'remind_wifi_connection.wav'}`).on('exit', async() => {
					Buffer_UserEvent(WIFI_DISCONNECTED);
				})
			}, 3000);
		}
		else {
			console.log('Internet connected');
			// exec(`aplay ${current_path}/Sounds/${'boot_sequence_intro_1.wav'}`).on('exit', async() => {
			// 	exec(`aplay ${current_path}/Sounds/${'hello_VA.wav'}`)
			// })
			exec(`echo 'nameserver 8.8.8.8' > /etc/resolv.conf`)
			await bluetooth_init()
			event_watcher()

			setTimeout(() => {
				//check client connection
				if(clientIsOnline === false)
					Buffer_UserEvent(CLIENT_ERROR)
			}, 3000);
		}
	})

}
var count_vol = 0
async function Buffer_ButtonEvent(command) {
	var current_vol

	switch(command) {
		case VOLUME_UP:
			count_vol++
			await amixer.volume_control('volumeup')
			current_vol = await amixer.volume_control('getvolume')
			await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UP, current_vol)
			console.log('volume up')
			break;
		case VOLUME_DOWN:
			await amixer.volume_control('volumedown')
			current_vol = await amixer.volume_control('getvolume')
			if(current_vol < 30) {
				await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_MUTE, current_vol)
			}
			else{
				await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_DOWN, current_vol)
			}
			console.log('volume down')
			break;
		case VOLUME_MUTE:
			await ioctl.mute()
			await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_MUTE)
			console.log('volume mute')
			break;
		case VOLUME_UNMUTE:
			current_vol = await amixer.volume_control('getvolume')
			await ioctl.unmute()
			await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UNMUTE, current_vol)
			console.log('volume unmute')
			break;
		// case MICROPHONE_MUTE:
		// 	await ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_MUTE)
		// 	console.log('microphone mute')
		// 	break;
		// case MICROPHONE_UNMUTE:
		// 	await ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_UNMUTE)
		// 	console.log('microphone unmute')
		// 	break;
		case BT_WAKEWORD_START:
			//recording audio
			if(isRecording != true) {
				if(clientIsOnline === true) {
					music_manager.eventsHandler(events.FadeInVolume)
					console.log("Begin Recording")
					isRecording = true;
					var eventJSON = eventGenerator.setSpeechRecognizer(onSession = onSession, dialogRequestId = dialogRequestId)
					eventJSON['sampleRate'] = 16000;
					if(onSession && lastInitiator) {
						eventJSON.event.payload.initiator = lastInitiator;
						lastInitiator = null;
					}
					onSession = false;
					dialogRequestId = null;
					startStream(eventJSON)
				}
			}
			break;
	}
}

function reset_micarray() {
	ioctl.reset()
	setTimeout(async() => {
		//enable usb audio
		await ioctl.Transmit(USER_EVENT, USB_AUDIO);
	}, 1500);
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
			await ioctl.Transmit(LED_RING, CLEAN_ALL);
			console.log('Led Ring clear effect');
			break;
	}
}

async function Buffer_UserEvent(command) {
	switch(command) {
		case WIFI_CONNECTED:
			await ioctl.Transmit(USER_EVENT, WIFI_CONNECTED)
			console.log('wifi was connected')
			break;
		case WIFI_DISCONNECTED:
			await ioctl.Transmit(USER_EVENT, WIFI_DISCONNECTED)
			console.log('wifi was disconnected')
			break;
		case WAKE_WORD_STOP:
			await ioctl.Transmit(USER_EVENT, WAKE_WORD_STOP)
			console.log('wakeword end')
			break;
		case MICROPHONE_MUTE:
			await ioctl.Transmit(USER_EVENT, MICROPHONE_MUTE)
			console.log('microphone mute')
			break;
		case MICROPHONE_UNMUTE:
			await ioctl.Transmit(USER_EVENT, MICROPHONE_UNMUTE)
			console.log('microphone unmute')
			break;
		case VOLUME_MUTE:
			await ioctl.mute()
			ioctl.Transmit(USER_EVENT, VOLUME_MUTE)
			console.log('muted');
			break;
		case RECORD_ERROR:
			await ioctl.Transmit(USER_EVENT, RECORD_ERROR);
			console.log('record error!!!');
			break;
		case BLE_ON:
			await ioctl.Transmit(USER_EVENT, BLE_ON);
			console.log('turn on bluetooth');
			break;
		case BLE_OFF:
			await ioctl.Transmit(USER_EVENT, BLE_OFF)
			console.log('turn off bluetooth');
			break;
		case USB_AUDIO:
			await ioctl.Transmit(USER_EVENT, USB_AUDIO)
			console.log('enable usb mic array');
			break;
		case CLIENT_ERROR:
			await ioctl.Transmit(USER_EVENT, CLIENT_ERROR)
			console.log('client error');
			break;
	}
}

async function BufferController(target, command) {
	switch(target) {
		// case LED_RING:
		// 	await Buffer_LedRingEvent(command)
		// 	break;
		case CYPRESS_BUTTON:
			await Buffer_ButtonEvent(command)
			break;
		case USER_EVENT:
			await Buffer_UserEvent(command)
			break;
	}
}


bluez_event.on('state', async(state) => {
	//console.log('bluetooth state: ' + state);
	music_manager.bluePlayer.setState(state)
	if(state == 'playing') {
		await music_manager.eventsHandler(events.B_Play)
		//need to fix when bluealsa support dmix
		await bluealsa_aplay_connect()
		music_manager.isMusicPlaying = true
	}
	else {//state = paused
		//need to fix when bluealsa support dmix
		await bluealsa_aplay_disconnect()
		music_manager.isMusicPlaying = false
	}
})

bluez_event.on('finished', async() => {
	music_manager.eventsHandler(events.B_Finished)
	music_manager.isMusicPlaying = false
})

/**
 * Main: running first
 */
main();