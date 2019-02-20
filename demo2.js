'use strict';
/* Library -------------------------------------------------------------------*/
const readline 			= require('readline');
const rl 				= readline.createInterface(process.stdin, process.stdout);

//var fifo 				= require('fifo')()
var fs 					= require('fs')
const path 				= require('path');
const config 			= require('./config.json');
const util 				= require('util');
const BinaryClient 		= require('binaryjs').BinaryClient;
const eventGenerator 	= require('./event');
const lame 				= require('lame');
const Speaker 			= require('speaker');
const event 			= require('events');
const recordingStream 	= require('node-record-lpcm16');
const moment 			= require('moment')
const exec_sync         = util.promisify(require('child_process').exec);
const { spawn } 		= require("child_process");
const exec 				= require("child_process").exec;
const i2c 				= require('i2c-bus')
const gpio 				= require('onoff').Gpio
var ioctl 				= require('./ioctl')
var music_manager 		= require('./music_player').getMusicManager()
const bluetooth_discoverable = require('./bluetooth').bluetooth_discoverable
const bluetooth_init 	= require('./bluetooth').bluetooth_init
const events 			= require('./music_player').events
const amixer 			= require('./amixer')
var bluez_event 		= require('./bluetooth').bluez_event
var bluetooth 			= require('./bluetooth').bluetooth
var bluealsa_aplay_connect = require('./bluetooth').bluealsa_aplay_connect
var bluealsa_aplay_disconnect = require('./bluetooth').bluealsa_aplay_disconnect
const i2c2 = i2c.openSync(2)

const pjsua 			= spawn('pjsua', ['--config-file', '/home/root/music-player/sip.cfg']);

/* Imports the Google Cloud client library */
const speech = require('@google-cloud/speech');
const current_path = require('path').dirname(require.main.filename);
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = `${current_path}/credentials.json`;
var rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.join(__dirname, './gd_bundle-g2-g1.crt'));


/* Creates a client */
const speech_client 	= new speech.SpeechClient();
var client = new BinaryClient('wss://chatbot.iviet.com:4433');

pjsua.stdin.setEncoding('utf8');
pjsua.stdout.on('data', (data) => {
	console.log(data.toString('utf8'));
});

function exec_command(input) {
	pjsua.stdin.write(`${input}\n`);
}

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

// Export gpio48 as an interrupt generating input with a debounceTimeout of 10
const gpio48 = new gpio(48, 'in', 'rising', {debounceTimeout: 10})
//Export gpio30 as an tinterrupt generating input with a debounceTimeout of 10
const gpio30 = new gpio(30, 'in', 'both', {debounceTimeout: 10});
// Export gpio88 as an interrupt generating input with a debounceTimeout of 10
const gpio88 = new gpio(88, 'in', 'rising', {debounceTimeout: 10});

const I2C_ADDRESS = 0x68;
const BUFF_SIZE = 0x02
const LED_RING = 0x00
const MIC_ARRAY = 0x01
const CYPRESS_BUTTON = 0x02
const USER_EVENT = 0x03
const VOLUME_UP = 0x20
const VOLUME_DOWN = 0x21
const VOLUME_MUTE = 0x22
const WAKEWORD_START = 0x23
const WAKEWORD_STOP = 0x24
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


var clientIsOnline
var wakeword_exec
var file_name = null
var file = null;

var clientStream;
var recognizeStream;
var isRecording = false;
var isBluePlaying = false;
var isBlueResume = false;
var isPlaystreamPlaying = false;
var musicPlayStreamResume = false

var volumebackup

var backupUrl = ''
var urlcount = 0
var AudioQueue = []
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
		//console.time('measure-received-url')
		//send end of sentence to mic-array
		Buffer_UserEvent(WAKEWORD_STOP)
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
		var intro_url = 'http://chatbot.iviet.com' + url
		console.log(intro_url);
		exec(`wget --no-check-certificate ${intro_url} -O - | mpg123 -`).on('exit', async() => {
			maikaowk_start()
		})
	})
	music_manager.url = 'http://music.olli.vn:50052/streaming?url=' + url
	music_manager.eventsHandler(events.W_NewSong)
}

function play_audioqueue() {
	return new Promise(async resolve => {
		if(AudioQueue.length > 0) {
			var url;
			url = AudioQueue.shift();
			console.log(`-->url: ${url}`);
			await exec_sync(`wget --no-check-certificate ${url} -O - | mpg123 -`);
		}
		resolve()
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
		if(url == 'lastResponseItem') {
			// Send the SpeechFinished event
			console.log('This is lastResponseItem');
			var eventJSON = eventGenerator.setSpeechSynthesizerSpeechFinished();
			eventJSON['sampleRate'] = 16000
			var responceStream = client.createStream(eventJSON)
		}
		else {
			//console.timeEnd('measure-received-url')
			var https = url.substring(0, 5)
			if(https == 'https') {
				AudioQueue.push(url);
			}
			else {
				AudioQueue.push(`http://chatbot.iviet.com${url}`);
			}
			urlcount++
			if(urlcount < 2) {
				//isPlaystreamPlaying = true
				var first_url = AudioQueue.shift();
				exec(`wget --no-check-certificate ${first_url} -O - | mpg123 -`).on('exit', async() => {
					//check again, if only have one url
					if(urlcount < 2) {
						if(musicPlayStreamResume === true) {
							music_manager.eventsHandler(events.Resume)
						}
						//reset flags
						urlcount = 0
						maikaowk_start()
					}
					else {//have many link url
						await play_audioqueue()
						//reset flags
						urlcount = 0;
						if(musicPlayStreamResume === true) {
							music_manager.eventsHandler(events.Resume)
						}
						maikaowk_start()
					}
					//todo: below used to expect speech event
					// isPlaystreamPlaying = false
					// if(backupUrl != '') {
					// 	playExpectSpeech()
					// }
				})
			}
		}
	})
}

// async function playExpectSpeech() {
// 	console.log('backupUrl: ' + backupUrl);
// 	exec(`${current_path}/playurl ${backupUrl}`).on('exit', async() => {
// 		backupUrl = ''
// 	})
// }

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

		//error_record()
		console.log('xin loi khong ghi am duoc!!!');
		exec(`aplay ${current_path}/Sounds/${'donthearanything.wav'}`).on('exit', function() {
			if(musicResume === true) {
					music_manager.eventsHandler(events.Resume)
			}
			maikaowk_start()
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
		maikaowk_start()
		return
	}

	/**
	 * Resume music.
	 */
	if (directive.header.namespace == "PlaybackController" && directive.header.name == "ResumeCommandIssued") {
		console.log('Resume Command');
		music_manager.eventsHandler(events.Resume)
		maikaowk_start()
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
			maikaowk_start()
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
			maikaowk_start()
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
				maikaowk_start()
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
			maikaowk_start()
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
		onSession = true;
		dialogRequestId = directive.header.dialogRequestId;
		lastInitiator = directive.payload.initiator;

		serverStream.on('data', (url) => {
			if(url === 'lastResponseItem') {
				// Send the SpeechFinished event
				//console.log('This is lastResponseItem');
				var eventJSON = eventGenerator.setSpeechSynthesizerSpeechFinished();
				eventJSON['sampleRate'] = 16000
				var responceStream = client.createStream(eventJSON)
			}
			else {
				//console.log('url: ' + url)
				var https = url.substring(0, 5)
				if(https == '/file') {
					var http_url = 'http://chatbot.iviet.com' + url
				}
				else {
					http_url = url
				}
				console.log('url link: ' + http_url);
				if(isPlaystreamPlaying === true) {
					backupUrl = http_url
						//console.log('we have a link url which need to play');
				}
				else {
					exec(`wget --no-check-certificate ${http_url} -O - | mpg123 -`)
				}
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
		i2c2.i2cReadSync(I2C_ADDRESS, BUFF_SIZE, RxBuff, function(error) {
			if(err) {
				console.log('error transfer');
			}
		})
		BufferController(RxBuff[0], RxBuff[1])
	})

	gpio88.watch(async(err) => {
		if (err) {
			throw err;
		}
		console.log('Wakeword detected')
		ioctl.Transmit(USER_EVENT, WAKEWORD_START)
		Buffer_ButtonEvent(WAKEWORD_START);
	})

}

function Output_Handler() {
	//Jack3.5 Interrupt attach
	gpio30.watch((err, value) => {
		if(err) {
			throw err;
		}
		if(value) {
			console.log('Switch to headphone');
			ioctl.OutputToJack3_5()
		}
		else {
			console.log('Switch to speaker');
			ioctl.OutputToSpeaker()
		}
	})
}

async function maikaowk_start()
{
	if((wakeword_exec === undefined) || (wakeword_exec.killed === true)) {
		console.log('start Wakeword');
		wakeword_exec = exec(`/home/root/maikao_wakeup`)
	}
}

async function maikaowk_stop()
{
	//exec(`ps -ef | grep maikao_wakeup | grep -v grep | awk '{print $2}' | xargs kill`)
	if(wakeword_exec != undefined) {
		wakeword_exec.kill('SIGINT')
	}
}
/**
 * Main
 *
 * @param {} ();
 */
async function main() {
	reset_micarray()
	exec(`/bin/bash /home/root/container/tlv320aic.sh`).on('exit', async() => {
		// if(gpio30.readSync()) {
		// 	await ioctl.OutputToJack3_5()
		// }
		// else {
		// 	await ioctl.OutputToSpeaker()
		// }
		await ioctl.OutputToSpeaker()
		setTimeout(() => {
			exec(`aplay ${current_path}/Sounds/${'boot_sequence_intro_1.wav'}`).on('exit', async() => {
				exec(`aplay ${current_path}/Sounds/${'hello_VA.wav'}`).on('exit', async() => {
					maikaowk_start()
				})
			})
		}, 1000);
		await bluetooth_init()
		event_watcher()
		//Output_Handler()
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
		case WAKEWORD_START:
			//recording audio
			if(isRecording != true) {
				if(clientIsOnline === true) {
					//await amixer.volume_control('fadeInVol');
					maikaowk_stop()
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
		case WAKEWORD_STOP:
			await ioctl.Transmit(USER_EVENT, WAKEWORD_STOP)
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
