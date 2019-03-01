'use strict';
/* Library -------------------------------------------------------------------*/
const readline 			= require('readline');
const rl 				= readline.createInterface(process.stdin, process.stdout);
//var fifo 				= require('fifo')()
var fs 					= require('fs')
const path 				= require('path');
const config 			= require('./conf/config.json');
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
var bluez_event 		= require('./bluetooth').bluez_event
var bluetooth 			= require('./bluetooth').bluetooth
var bluealsa_aplay_connect = require('./bluetooth').bluealsa_aplay_connect
var bluealsa_aplay_disconnect = require('./bluetooth').bluealsa_aplay_disconnect
const playurl 				= require('./playurlStream.js')
const command 				= require('./command.js')
const i2c2 = i2c.openSync(2)

/* Imports the Google Cloud client library */
const speech = require('@google-cloud/speech');
const current_path = require('path').dirname(require.main.filename);
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = `${current_path}/conf/credentials.json`;
var rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.join(__dirname, './conf/gd_bundle-g2-g1.crt'));

/* Creates a client */
const speech_client 	= new speech.SpeechClient();

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

const buffers =  require('./buffers.js').buffers
var RxBuff = new Buffer([0x00, 0x00])


var clientIsOnline

var file_name = null
var file = null;

var clientStream;
var client;
var recognizeStream;
var isRecording = false;
var isBluePlaying = false;
var isBlueResume = false;
var isPlaystreamPlaying = false;
var musicPlayStreamResume = false


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
	// }, 10000)
}

/**
 * Stop streaming when end of sentence
 *
 * @param {}
 */
async function stopStream() {
	if(clientIsOnline === true){
		command.fadeOutVolume()
		console.log('stop stream');
		recognizeStream.end();
		recordingStream.stop();
		//file.end()
		clientStream.end();
		//send the end of sentence to mic-array
		command.UserEvent(buffers.WAKEWORD_STOP)
		isRecording = false
	}
}


async function webPlayNewSong(serverStream, url)
{
	serverStream.on('data', (url) =>{
		var intro_url = 'http://chatbot.iviet.com' + url
		console.log(intro_url);
		playurl.intro(intro_url)
	})
	music_manager.url = 'http://music.olli.vn:50052/streaming?url=' + url
	music_manager.eventsHandler(events.W_NewSong)
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
					}
					else {//have many link url
						await playurl.audioqueue(AudioQueue)
						//reset flags
						urlcount = 0;
						if(musicPlayStreamResume === true) {
							music_manager.eventsHandler(events.Resume)
						}
					}
				})
			}
		}
	})
}

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

async function wakeword_detected() {
	//recording audio
    if(isRecording != true) {
        if(clientIsOnline === true) {
        	await command.fadeInVolume()
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
}

function event_watcher() {
	gpio48.watch((err) => {
		if (err) {
			throw err;
		}
		//console.log('Receiving data from Mic-array')
		i2c2.i2cReadSync(buffers.I2C_ADDRESS, buffers.BUFF_SIZE, RxBuff, function(error) {
			if(err) {
				console.log('error transfer');
			}
		})
		if((RxBuff[0] === buffers.BUTTON) || (RxBuff[1] === buffers.WAKEWORD_START)) {
			//wakeword button event here
			wakeword_detected()
		}
		else{
			command.SwitchContextBuffer(RxBuff[0], RxBuff[1])
		}
	})

	gpio88.watch(async(err) => {
		if (err) {
			throw err;
		}
		//voice keyword detected
		//console.log('Wakeword detected')
		ioctl.Transmit(buffers.USER_EVENT, buffers.WAKEWORD_START)
		wakeword_detected()
	})

}

function AudioOutput_IRQ() {
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

function client_manager() {
	client = new BinaryClient('wss://chatbot.iviet.com:4433');

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

			//error_record
			console.log('recording error!!!');
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
					command.ButtonEvent(buffers.VOLUME_UP)
				}
				else {
					command.ButtonEvent(buffers.VOLUME_DOWN)
				}
			}

			/* Volume Mute. */
			if (directive.header.name == "SetMute") {
				if (directive.payload.mute == true)
				{
					/* Mute */
					command.ButtonEvent(buffers.VOLUME_MUTE)
				}
				else {
					/* Unmute */
					command.ButtonEvent(buffers.VOLUME_UNMUTE)
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
				command.UserEvent(buffers.BLE_ON)
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
				command.UserEvent(buffers.BLE_OFF)
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
						playurl.intro(http_url)
					}
				}
			})
		}

		if (directive.header.namespace == "Calling") {
			if(music_manager.isMusicPlaying == true) {
				music_manager.eventsHandler(events.Pause)
			}
		}

	});

}
//Code and state may be one of the following:
//0: 'unknown'
// 10: 'asleep'
// 20: 'disconnected'
// 30: 'disconnecting'
// 40: 'connecting'
// 50: 'connected_local'
// 60: 'connected_site'
// 70: 'connected_global'

function network_manger() {
	const dbus = require('dbus-native')
	var bus = dbus.systemBus()
	var services = bus.getService('org.freedesktop.NetworkManager')

	services.getInterface(
				'/org/freedesktop/NetworkManager', 
				'org.freedesktop.NetworkManager', function(err, iface) {
		if(err) console.error(err)

		iface.on('StateChanged', function(value) {
			//console.log('state: ' + value)
			if(value >= 60) {
				console.log('probably connected to the internet')
				client_manager()
				WifiConnected()
			}
			else {
				console.log('probably not connected to the internet')
			}
		})
	})
}

/**
 * Main
 *
 * @param {} ();
 */
async function main() {
	apps_start()
	exec(`/bin/bash /home/root/container/tlv320aic.sh`).on('exit', async() => {
		// if(gpio30.readSync()) {
		// 	await ioctl.OutputToJack3_5()
		// }
		// else {
		// 	await ioctl.OutputToSpeaker()
		// }
		require('dns').resolve('www.google.com', function(err) {
			if(err) {
				console.log('No internet connection')
				//exec(`nmcli con up dg-ap`)
				command.UserEvent(buffers.WIFI_DISCONNECTED)
			}
			else {
				console.log('Internet Connected')
				client_manager()
			}
		})
		await ioctl.OutputToSpeaker()
		setTimeout(() => {
			exec(`aplay ${current_path}/Sounds/${'boot_sequence_intro_1.wav'}`).on('exit', async() => {
				exec(`aplay ${current_path}/Sounds/${'hello_VA.wav'}`).on('exit', async() => {
					exec(`/home/root/wakeword-snsr -t /home/root/model/spot-hbg-enUS-1.3.0-m.snsr`)
				})
			})
		}, 1000);
		await bluetooth_init()
		event_watcher()
		network_manger()
		//AudioOutput_IRQ()
		setTimeout(() => {
			console.log('auto agent registered');
			exec(`python ${current_path}/agent.py`)
		}, 3000);
	})
}



function WifiConnected() {
	//stop effect on ledring
	command.Ledring_Effect(buffers.LED_PATTERN, 0x39)
	command.UserEvent(buffers.WIFI_CONNECTED)
	setTimeout(() => {
		//enable usb audio
		UserEvent(USB_AUDIO)
	}, 3000);
}

function apps_start() {
	ioctl.reset()
	setTimeout(async() => {
		//enable usb audio
		await ioctl.Transmit(buffers.USER_EVENT, buffers.ALL_LED_ON);
	}, 1500);
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
