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
const moment = require('moment')

const { spawn } = require("child_process");
const pjsua = spawn('pjsua', ['--config-file', '/home/root/music-player/sip.cfg']);
pjsua.stdin.setEncoding('utf8');
pjsua.stdout.on('data', (data) => {
	console.log(data.toString('utf8'));
});

function exec_command(input) {
	pjsua.stdin.write(`${input}\n`);
}

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
};

/* Creates a client */
const speech_client = new speech.SpeechClient();

const exec = require("child_process").exec;
const i2c = require('i2c-bus')
const gpio = require('onoff').Gpio
var ioctl = require('./ioctl')

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
const ERROR_RECORD = 0x42
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
//var fifo = require('fifo')()
var clientIsOnline
var file_name = null
var file = null;
var client = new BinaryClient('wss://chatbot.iviet.com:4433');
var clientStream;
var recognizeStream;
var isRecording = false;
var isBluePlaying = false;
var isBlueResume = false;
var isPlaystreamPlaying = false;
var musicPlayStreamResume = false

var volumebackup

var music_manager = require('./music_player').getMusicManager()
const bluetooth_discoverable = require('./bluetooth').bluetooth_discoverable
const bluetooth_init = require('./bluetooth').bluetooth_init
const events = require('./music_player').events
const amixer = require('./amixer')
var bluez_event = require('./bluetooth').bluez_event
var bluetooth = require('./bluetooth').bluetooth
var bluealsa_aplay_connect = require('./bluetooth').bluealsa_aplay_connect
var bluealsa_aplay_disconnect = require('./bluetooth').bluealsa_aplay_disconnect
var EventEmitter = require('events').EventEmitter
var ExpectSpeechEvent = new EventEmitter()
var backupUrl = ''
var urlcount = 0
var linkurl = []
/* Private function ----------------------------------------------------------*/
/**
 * After getting the wake word, this function will stream audio recording to server.
 *
 * @param {object} eventJSON.
 */
async function startStream(eventJSON) {
	//file_name = moment().format("YYYYMMDDHHmmss") + '.wav'
	//file = fs.createWriteStream(file_name, { encoding: 'binary' })
	const START_VAL = 30;
	const REFRESH_VAL = 10;
	var countdown_speechstream = REFRESH_VAL;

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
	};

	/* Create a recognize stream */
	recognizeStream = speech_client
		.streamingRecognize(request)
		.on('error', (err) => {
			//console.log(err);
		})
		.on('data', () => {
			countdown_speechstream = REFRESH_VAL;
		})
		.on('end', () => {
			console.log('end of google dectection');
		})

	var streamToServer = recordingStream
		.start({
			sampleRate: 	16000,
			channels: 		1,
			verbose: 		false,
			recordProgram: 	'arecord', // Try also "rec" or "sox"
			device: 		'plughw:1,0',
		})
		.on('error', (err) => {
			console.log(err);
		})
		.on('end', () => {
			console.log('end recording');
		})

	streamToServer.pipe(recognizeStream);
	streamToServer.pipe(clientStream);
	//streamToServer.pipe(file);// remove comment if you want to save recording file
	console.log("Speak now!!!");

	countdown_speechstream = START_VAL;
	setInterval(async function() {
		countdown_speechstream--;
		if(countdown_speechstream == 0) {
			stopStream();
			clearInterval(this);
		}
	}, 100);

	// setTimeout(function () {
	// 	console.log('Timeout recording!!!!');
	// 	stopStream();
	// }, 4000)
}

/**
 * Stop streaming when end of sentence
 *
 * @param {}
 */
async function stopStream() {
	if(clientIsOnline === true){
		//await amixer.volume_control('fadeOutVol')
		amixer.volume_control(`setvolume ${volumebackup}`)
		console.log('stop stream');
		recognizeStream.end();
		recordingStream.stop();
		//file.end()
		clientStream.end();
		console.time('measure-received-url')
		//send end of sentence to mic-array
		Buffer_UserEvent(WAKE_WORD_STOP)
		//music_manager.eventsHandler(events.FadeOutVolume)
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
	serverStream.on('data', (url) =>{
		console.timeEnd('measure-received-url')
		var intro_url = 'http://chatbot.iviet.com' + url
		console.log(intro_url);
		exec(`${current_path}/playurl ${intro_url}`)
	})
	music_manager.url = 'http://music.olli.vn:50052/streaming?url=' + url
	music_manager.eventsHandler(events.W_NewSong)
}

function playlinkurl(input) {
	return new Promise(async resolve => {
		var https = input.substring(0, 5)
		if(https == 'https') {
			//console.log('https_link: ' + input);
			//play https mp3 using mpg123
			exec(`${current_path}/mpg123_https.sh ${input}`).on('exit', () => {
				resolve()
			})
		}
		else if(https == '/file') {
			var http_url = 'http://chatbot.iviet.com' + input
			//console.log('http link: ' + http_url);
			exec(`${current_path}/playurl ${http_url}`).on('exit', () => {
				resolve()
			})
		}
	})
}

function playStream(serverStream) {
	musicPlayStreamResume = false
	if(music_manager.isMusicPlaying == true) {
		music_manager.eventsHandler(events.Pause)
		musicPlayStreamResume = true
	}

	console.log('playStream via url');
	serverStream.on('data', (url) => {
		var https = url.substring(0, 5)
		if(https == 'lastR') {
			// Send the SpeechFinished event
			console.log('This is lastResponseItem');
			var eventJSON = eventGenerator.setSpeechSynthesizerSpeechFinished();
			eventJSON['sampleRate'] = 16000
			var responceStream = client.createStream(eventJSON)
		}
		else {
			console.timeEnd('measure-received-url')
			console.log('url: ' + url)
			linkurl[urlcount] = url
			urlcount++
			if(urlcount < 2) {
				if(https == 'https') {
					//console.log(url);
					exec(`${current_path}/mpg123_https.sh ${linkurl[0]}`).on('exit', async() => {
						if(musicPlayStreamResume === true) {
							music_manager.eventsHandler(events.Resume)
						}
						//reset flags
						urlcount = 0
					})
				}
				else {
					isPlaystreamPlaying = true
					var http_url = 'http://chatbot.iviet.com' + linkurl[0]
					exec(`${current_path}/playurl ${http_url}`).on('exit', async() => {
						if(urlcount < 2) {
							if(musicPlayStreamResume === true) {
								music_manager.eventsHandler(events.Resume)
							}
							//reset flags
							urlcount = 0
						}
						else {
							//play linkurl in array
							playurlStream()
						}

						//todo: below used to expect speech event
						isPlaystreamPlaying = false
						if(backupUrl != '') {
							playExpectSpeech()
						}
					})
				}
			}
		}
	})
}

async function playExpectSpeech() {
	console.log('backupUrl: ' + backupUrl);
	exec(`${current_path}/playurl ${backupUrl}`).on('exit', async() => {
		backupUrl = ''
	})
}

async function playurlStream() {
	for(var i=1; i < urlcount; i++) {
		if(linkurl[i] != '') {
			await playlinkurl(linkurl[i])
			linkurl[i] = ''
		}
	}
	//reset flags
	urlcount = 0

	//resume music
	if(musicPlayStreamResume === true) {
		music_manager.eventsHandler(events.Resume)
	}
}

// ExpectSpeechEvent.on('expectspeech', async() => {
// 	console.log('backupUrl: ' + backupUrl);
// 	exec(`${current_path}/playurl ${backupUrl}`).on('exit', async() => {
// 		backupUrl = ''
// 	})
// })

// ExpectSpeechEvent.on('playlinkurl', async() => {
// 	for(var i=1; i < urlcount; i++) {
// 		if(linkurl[i] != '') {
// 			await playurlStream(linkurl[i])
// 			linkurl[i] = ''
// 		}
// 	}
// 	//reset flags
// 	urlcount = 0

// 	//resume music
// 	if(musicPlayStreamResume === true) {
// 		music_manager.eventsHandler(events.Resume)
// 	}
// })
/**
 * Receiving directive and streaming source from server to this client after streamed audio recording to server.
 *
 * @resource : event from server.
 * @param {object} serverStream : streaming audio from server.
 * @param {object} directive : use to switch context and control the devices.
 */
client.on("stream", async (serverStream, directive) => {
	//console.log("Server Meta is " + JSON.stringify(directive));
	console.log("Client <--> Backend total response time");
	console.log(`${directive.header.namespace} == ${directive.header.name} == ${directive.payload.format} \
	== ${directive.card == null ? directive.card : directive.card.cardOutputSpeech}`)

	console.log('RAWSPEECH: ' + directive.header.rawSpeech)
	if (directive.header.name == "Recognize" && directive.payload.format == "AUDIO_L16_RATE_16000_CHANNELS_1") {
		var musicResume = false
		if(music_manager.isMusicPlaying == true) {
			music_manager.eventsHandler(events.Pause)
			musicResume = true
		}

		error_record()
		console.log('xin loi khong ghi am duoc!!!');
		exec(`aplay ${current_path}/Sounds/${'donthearanything.wav'}`).on('exit', function() {
			if(musicResume === true) {
					music_manager.eventsHandler(events.Resume)
			}
		})
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
			Buffer_UserEvent(BLE_ON)
			exec(`aplay ${current_path}/Sounds/${'bluetooth_connected_322896.wav'}`).on('exit', async() => {

				if(isBlueResume != true) {
					setTimeout(() => {
						if(musicResume === true) {
							music_manager.eventsHandler(events.Resume)
						}
					}, 500);
				}
				else {
					isBlueResume = false;//reset flags
				}
			})
		}
		else if (directive.header.name == "DisconnectDevice") {
			Buffer_UserEvent(BLE_OFF)
			await bluetooth_discoverable('off')

			if(isBlueResume != true) {
				setTimeout(() => {
					if(musicResume === true) {
						music_manager.eventsHandler(events.Resume)
					}
				}, 500);
			}
			else {
				isBlueResume = false;//reset flags
			}
		}
		return
	}

	/* PUT this at last to avoid earlier matching */
	if (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Silent") {
		if(music_manager.isMusicPlaying == true) {
			music_manager.eventsHandler(events.Pause)
		}
		var eventJSON = eventGenerator.setSpeechSynthesizerSpeechFinished();
		eventJSON['sampleRate'] = 16000
		var responceStream = client.createStream(eventJSON)
	}

	if(directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Speak") {
			console.log("SpeechSynthesizer only Playing Stream below")
			playStream(serverStream);
		return
	}

	if (directive.header.namespace == "SpeechRecognizer" && directive.header.name == "ExpectSpeech") {
		//console.log('event expectspeech');
		onSession = true;
		dialogRequestId = directive.header.dialogRequestId;
		lastInitiator = directive.payload.initiator;

		serverStream.on('data', (url) => {
			//console.log('url: ' + url)
			var https = url.substring(0, 5)
			if(https == '/file') {
				var http_url = 'http://chatbot.iviet.com' + url
				console.log('http link: ' + http_url);
				if(isPlaystreamPlaying === true) {
					backupUrl = http_url
					//console.log('need to play audio');
				}
				else {
					exec(`${current_path}/playurl ${http_url}`)
				}
			}
			else if(https == 'lastR') {
				// Send the SpeechFinished event
				//console.log('This is lastResponseItem');
				var eventJSON = eventGenerator.setSpeechSynthesizerSpeechFinished();
				eventJSON['sampleRate'] = 16000
				var responceStream = client.createStream(eventJSON)
			}
		})
	}

	if (directive.header.namespace == "Calling") {
		if(music_manager.isMusicPlaying == true) {
			music_manager.eventsHandler(events.Pause)
		}

		exec_command(`m`);
		setTimeout(() => {
			exec_command(`sip:10015@35.240.201.210;transport=tcp`);
		}, 100);
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


/**
 * Main
 *
 * @param {} ();
 */
async function main() {
	reset_micarray()
	exec(`/bin/bash /home/root/tlv320aic.sh`).on('exit', async() => {
		setTimeout(() => {
			exec(`aplay ${current_path}/Sounds/${'boot_sequence_intro_1.wav'}`).on('exit', async() => {
				exec(`aplay ${current_path}/Sounds/${'hello_VA.wav'}`)
			})
		}, 1000);
		await bluetooth_init()
		event_watcher()
		setTimeout(() => {
			console.log('auto agent registered');
			exec(`python ${current_path}/agent.py`)
			//check client connection
			if(clientIsOnline === false)
				Buffer_UserEvent(CLIENT_ERROR)
		}, 3000);
	})
}

async function Buffer_ButtonEvent(command) {
	var current_vol

	switch(command) {
		case VOLUME_UP:
			current_vol = await amixer.volume_control('volumeup')
			//current_vol = await amixer.volume_control('getvolume')
			await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UP, current_vol)
			console.log('volume up')
			console.log('current volume: ' + current_vol);
			break;
		case VOLUME_DOWN:
			current_vol = await amixer.volume_control('volumedown')
			//current_vol = await amixer.volume_control('getvolume')
			if(current_vol < 30) {
				await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_MUTE, current_vol)
			}
			else{
				await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_DOWN, current_vol)
			}
			console.log('volume down')
			console.log('current volume: ' + current_vol);
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
					//await amixer.volume_control('fadeInVol');
					volumebackup = await amixer.volume_control('getvolume')
					await amixer.volume_control('setvolume 20')
					//music_manager.eventsHandler(events.FadeInVolume)
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

function error_record() {
	ioctl.reset()
	setTimeout(async() => {
		//error record
		await ioctl.Transmit(USER_EVENT, ERROR_RECORD)
	}, 1500);
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
		case ERROR_RECORD:
			await ioctl.Transmit(USER_EVENT, ERROR_RECORD);
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

bluez_event.on('connected', async() => {
	music_manager.eventsHandler(events.FadeInVolume)
	setTimeout(async() => {
	//new device notification
		exec(`aplay ${current_path}/Sounds/${'VA_bluetooth_connected.wav'}`).on('exit', () => {
			music_manager.eventsHandler(events.FadeOutVolume)
		})
	}, 100);
})

bluez_event.on('finished', async() => {
	music_manager.eventsHandler(events.B_Finished)
	if(isBluePlaying === true) {
		music_manager.isMusicPlaying = false
		isBlueResume = true
	}
	else {
		isBlueResume = false
	}
	isBluePlaying = false
})

bluetooth.on('update state', async(state) => {
	console.log('bluetooth state: ' + state);
	music_manager.bluePlayer.setState(state)
	if(state == 'playing') {
		//need to fix when bluealsa support dmix
		await bluealsa_aplay_connect()
		music_manager.eventsHandler(events.B_Play)
		music_manager.isMusicPlaying = true
		isBluePlaying = true
	}
	else {//state = paused or stopped
		//need to fix when bluealsa support dmix
		await bluealsa_aplay_disconnect()
		music_manager.isMusicPlaying = false
		isBluePlaying = false
	}
})
/**
 * Main: running first
 */
main();