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
const wav = require('wav')
const event = require('events');
const recordingStream = require('node-record-lpcm16');
/* Imports the Google Cloud client library */
const speech = require('@google-cloud/speech');
const current_path = require('path').dirname(require.main.filename);
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = `${current_path}/credentials.json`;
const print = new (require('./print'))([1, 2, 3, 4]);

var rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.join(__dirname, './gd_bundle-g2-g1.crt'));

/* will work with all https requests will all libraries (i.e. request.js) */
require('https').globalAgent.options.ca = rootCas;


/* Checking and backing up the volume after and before mute */
var EndPlaystream = new event();

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
//    mode: lame.STEREO
};

/* Creates a client */
const speech_client = new speech.SpeechClient();

const exec = require("child_process").exec;
const i2c = require('i2c-bus')
const gpio = require('onoff').Gpio
var ioctl = require('./ioctl')
var EventEmitter = require('events').EventEmitter
var BufferEvents = new EventEmitter()

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

var RxBuff = new Buffer([0x00, 0x00])

const i2c1 = i2c.openSync(1)
var fs = require('fs')
var fifo = require('fifo')()
var file_stream = null
var file_record = null

var clientIsOnline = null

var client = BinaryClient(util.format("wss://%s:8080", config.IP_SERVER));
var clientStream;
var recognizeStream;
var isRecording = false;

var music_manager = require('./music_player').getMusicManager()
const bluetooth_discoverable = require('./bluetooth').bluetooth_discoverable
const bluetooth_init = require('./bluetooth').bluetooth_init
const events = require('./music_player').events
const amixer = require('./amixer')
var bluez_event = require('./bluetooth').bluez_event
/* Private function ----------------------------------------------------------*/
/**
 * After getting the wake word, this function will stream audio recording to server.
 *
 * @param {object} eventJSON.
 */
async function startStream(eventJSON) {
    //fading volume
    amixer.volume_control('fadeInVol')

    file_record = fs.createWriteStream('recorded.wav', { encoding: 'binary' })
    //file_stream = fs.createWriteStream('streaming.wav', { encoding: 'binary'});

    if(clientIsOnline == true){
        console.log('online')
        clientStream = client.createStream(eventJSON)
    }
    else {
        console.log('offline')
        return
    }

    // const request = {
    //     config: {
    //         encoding: mic_options.encoding,
    //         sampleRateHertz: mic_options.sampleRateHertz,
    //         languageCode: mic_options.languageCode,
    //     },
    //     interimResults: true, /* If you want interim results, set this to true */
    //     singleUtterance: false
    // };

    /* Create a recognize stream */
    // recognizeStream = speech_client
    //     .streamingRecognize(request)
    //     .on('error', (err) => {
    //         console.log('google speech ' + err);
    //     })
    //     .on('data', (data) => {
    //     })
    //     .on('end', () => {
    //         console.log('google speech ended');
    //         //emit signal StopStream here
    //     })

    var streams = recordingStream
        .start({
            sampleRate: 16000,
            //threshold: 0,
            verbose: false,
            recordProgram: 'arecord', // Try also "rec" or "sox"
            device: 'plughw:1,0',
            //silence: '0'
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
            console.log('ended recording');
        })

    streams.pipe(clientStream);
    streams.pipe(file_record);// remove comment if you want to save recording file
//    streams.pipe(recognizeStream);
    print.log(1, "Speak now!!!");

    setTimeout(function () {
        console.log('stop recording');
        stopStream();
    }, 3000)
}

/**
 * Stop streaming when end of sentence
 *
 * @param {}
 */
function stopStream() {
//    print.log(1, "Stop stream");
    if(file_stream != null){
        file_stream.end()
        file_stream = null
        file_record = null
    }
    if(clientIsOnline == true){
        console.log('stop stream');
        recordingStream.stop();
//        recognizeStream.end();
        clientStream.end();
        isRecording = false

        //send end of sentence to mic-array
        BufferEvents.emit('user event', WAKE_WORD_STOP)
        amixer.volume_control('fadeOutVol')
    }
}

client.on("open", () => {
    console.log('client ok');
    clientIsOnline = true
})

client.on("pong", (data, flags) => {
    print.log(1, "PONG received")
})

client.on("error", (error) => {
    clientIsOnline = false
});


/**
 * Play STT streaming
 *
 * @param {object} serverStream : streaming audio from server
 * @param {object} options.
 */
function playTTSStream(serverStream, options) {
    const playevent = new event();
    var speaker = new Speaker(audioOptions);
    console.log("TTS Streaming: Speaker created")

    console.log('Created Speaker');
    //var pcm = fs.createWriteStream("audio.pcm");
    //var audio_data = new Buffer(0);
    var reader = new wav.Reader()
    reader.pipe(speaker)

    //remove below if you don't want to save audio file from server
    // serverStream.on('data', function(chunk) {
    //         audio_data = Buffer.concat([audio_data, chunk]);
    //     })
    // serverStream.on('end', function() {
    //     console.log('file size ' + audio_data.length);
    //     if(audio_data.length > 0){
    //         pcm.write(audio_data)
    //     }
    // })

    serverStream.pipe(reader).on('end', () => {
        setTimeout(() => {
            playevent.emit('end');
        }, 300);
    })

    return playevent;
}


async function webPlayNewSong(serverStream, url)
{
    var speaker = new Speaker(audioOptions);
    var reader = new wav.Reader()
    reader.pipe(speaker)

    serverStream.pipe(reader).on('end', () => {
        setTimeout(() => {
        }, 300);
    })

    music_manager.url = url
    music_manager.eventsHandler(events.W_NewSong)
}
/**
 * Play audio file streaming
 *
 * @param {object} serverStream : streaming audio from server
 * @param {object} options.
 */
function playFileStream(serverStream, options) {
    const playevent = new event();
    var decoder = lame.Decoder();
    options = options || {};
    var speaker = new Speaker(audioOptions);
    print.log(1, "File Streaming: Speaker created")

    function start() {
        decoder.pipe(speaker)
        serverStream.pipe(decoder).on('end', () => {
            setTimeout(() => {
                playevent.emit('end');
            }, 300);
        })
    }

    start();
    return playevent;
}

/**
 * Play Audio streaming.
 *
 * @param {object} serverStream : streaming audio from server.
 * @param {object} directive : use to switch audio source.
 * @param {object} options.
 */

function playStream(input, directive, options) {
    return new Promise(async resolve => {
        var event;
        var musicResume = false
        if(music_manager.isMusicPlaying == true) {
            music_manager.eventsHandler(events.Pause)
            musicResume = true
        }

        if (directive.payload.format == "file") {
            event = playFileStream(input);
        }
        else if (directive.payload.format == "polly") {
            event = playTTSStream(input);
        }

        else if (directive.payload.format == "olli_ssml") {
            event = playTTSStream(input)
        }

        event.on('end', async() => {
            if(musicResume == true) {
                music_manager.eventsHandler(events.Resume)
            }
        })
        resolve(event);
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
    print.log(3, "Server Meta is " + JSON.stringify(directive));
    print.log(3, "Client <--> Backend total response time");
    print.log(2, `${directive.header.namespace} == ${directive.header.name} == ${directive.payload.format} == ${directive.header.rawSpeech} \
    == ${directive.card == null ? directive.card : directive.card.cardOutputSpeech}`)

    if (directive.header.name == "Recognize" && directive.payload.format == "AUDIO_L16_RATE_16000_CHANNELS_1") {
        //ioctl.reset()
        console.log('xin loi eo ghi am duoc!!!');
        BufferEvents.emit('user event', RECORD_ERROR)
    }

    if (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "ErrorExpectSpeech") {
        onSession = true;
        dialogRequestId = directive.header.dialogRequestId;
        lastInitiator = directive.payload.initiator;
        // if (await mp.command_input('isplay') == 'play') {
        //     mp.command_input('stop');
        // }
        console.log('what the fuck is going on');
        /* Need to restore sound volume when finish recoding streaming */
        EndPlaystream.emit('end');
        return;
    }

    if (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Empty") {
        onSession = true;
        dialogRequestId = directive.header.dialogRequestId;
        lastInitiator = directive.payload.initiator;
        EndPlaystream.emit('end');
        return
    }

    /**
     * Playing music.
     */
    if (directive.header.namespace == "AudioPlayer" && directive.header.name == "Play") {
        const url = directive.payload.audioItem.stream.url;
        console.log("Playing song at url: " + JSON.stringify(directive.payload));
        await webPlayNewSong(serverStream, url)
        EndPlaystream.emit('end');
        return
    }

    /**
     * Pause music.
     */
    if (directive.header.namespace == "PlaybackController" && directive.header.name == "PauseCommandIssued") {
        EndPlaystream.emit('end');
        console.log('Pause command');
        music_manager.eventsHandler(events.Pause)
        return
    }

    /**
     * Resume music.
     */
    if (directive.header.namespace == "PlaybackController" && directive.header.name == "ResumeCommandIssued") {
        EndPlaystream.emit('end');
        console.log('Resume Command');
        music_manager.eventsHandler(events.Resume)
        return
    }

    if (directive.header.namespace == "Alerts" && directive.header.name == "SetAlert") {
            playStream(serverStream, directive);
    }

    /**
     * Volume adjust.
     */
    if (directive.header.namespace == "Speaker") {
        if (directive.header.name == "AdjustVolume") {
            EndPlaystream.emit('end');
            setTimeout(() => {
                if (directive.payload.volume >= 0) {
                    amixer.volume_control('volumeup')
                }
                else {
                    amixer.volume_control('volumedown')
                }
            }, 100);
        }

        /* Volume Mute. */
        if (directive.header.name == "SetMute") {
            if (directive.payload.mute == true)
            {   /* Mute */
                BufferEvents.emit('button', VOLUME_MUTE)
                EndPlaystream.emit('end');
            }
            else
            {   /* Unmute */
                BufferEvents.emit('button', VOLUME_UNMUTE)
                EndPlaystream.emit('end');
                return;
            }
        }
    }

    /**
     * Opening bluetooth.
     */
    if (directive.header.namespace == "Bluetooth") {
        EndPlaystream.emit('end');
        if (directive.header.name == "ConnectByDeviceId") {
            await bluetooth_discoverable('off')
            await bluetooth_discoverable('on')
            await exec(`aplay ${current_path}/Sounds/${'bluetooth_connected_322896.wav'}`)

        }
        else if (directive.header.name == "DisconnectDevice") {
           await bluetooth_discoverable('off')
        }
    }

    /**
     * Switching audio source.
     */
    if (directive.header.namespace == "AudioSource") {
        EndPlaystream.emit('end');
        console.log('switch audio source');
        // if (directive.header.name == "Cloud") {
        //     await mp.command_input('src APP');
        //     mp.command_input('play');
        // }
        // else if (directive.header.name == "Bluetooth") {
        //     await mp.command_input('src BLE');
        //     mp.command_input('play');
        // }
    }

    /* PUT this at last to avoid earlier matching */
    if ((directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "ExpectSpeech")
        || (directive.header.namespace == "SpeechSynthesizer" && directive.header.name == "Speak")) {
            print.log(1, "SpeechSynthesizer only Playing Stream below")
            const playStreamevent = await playStream(serverStream, directive);
            playStreamevent.on('end', () => {
                EndPlaystream.emit('end');
            })

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

/**
 * Input command line.
 *
 * @param {string} prompt.
 * @param {callback}{string} handler.
 */
function promptInput(prompt, handler) {
    rl.question(prompt, input => {
        if (handler(input) !== false) {
            promptInput(prompt, handler);
        }
        else {
            rl.close();
        }
    });
}

gpio48.watch((err, value) => {
    if (err) {
        throw err;
    }
    //console.log('Receiving data from Mic-array')
    i2c1.i2cReadSync(I2C_ADDRESS, BUFF_SIZE, RxBuff, function(error) {
        if(err) {
            ioctl.reset()
            throw err;
        }
    })
    BufferEvents.emit('i2c event', RxBuff[0], RxBuff[1])
})

/**
 * Main
 *
 * @param {} ();
 */
async function main() {
    //ioctl.reset()//reset Micarray for running
    await bluetooth_init()

    console.log('set default volume as 40%');
    await amixer.volume_control('setvolume 40')

    promptInput('Command > ', input => {
        var command, arg;
        var index_str = input.indexOf(" ");

        if (index_str >= 0) {
            command = input.slice(0, index_str);
            arg = input.slice(index_str + 1, input.length);
        }
        else {
            command = input;
        }
        switch (command) {
            case 'r': /* Start recording */
                if(isRecording != true) {
                    if(clientIsOnline == true) {
                        print.log(1, "Begin Recording")
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
            case 'exit':
            case 'quit':
            case 'q':
                quit()
                return false;
        }
    });
}


BufferEvents.on('button', async(command)=> {
    var current_vol;

    switch(command) {
        case VOLUME_UP:
            await amixer.volume_control('volumeup')
            current_vol = await amixer.volume_control('getvolume')
            await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UP, current_vol)
            console.log('volume up')
            break;
        case VOLUME_DOWN:
            await amixer.volume_control('volumedown')
            current_vol = await amixer.volume_control('getvolume')
            if(current_vol < 30) {
                await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_MUTE)
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
            await ioctl.unmute()
            await ioctl.Transmit(CYPRESS_BUTTON, VOLUME_UNMUTE, 0x02)
            console.log('volume unmute')
            break;
        case MICROPHONE_MUTE:
            await ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_MUTE)
            console.log('microphone mute')
            break;
        case MICROPHONE_UNMUTE:
            await ioctl.Transmit(CYPRESS_BUTTON, MICROPHONE_UNMUTE)
            console.log('microphone unmute')
            break;
        case BT_WAKEWORD_START:
            //recording audio
            if(isRecording != true) {
                if(clientIsOnline == true) {
                    print.log(1, "Begin Recording")
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
})

BufferEvents.on('led ring', async(command) => {
    switch(command) {

    }
})

BufferEvents.on('user event', async(command) => {
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
            break;
        case MICROPHONE_MUTE:
            ioctl.Transmit(USER_EVENT, MICROPHONE_MUTE)
            console.log('microphone mute')
            break;
        case MICROPHONE_UNMUTE:
            ioctl.Transmit(USER_EVENT, MICROPHONE_UNMUTE)
            console.log('microphone unmute')
            break;
        case VOLUME_MUTE:
            ioctl.mute()
            ioctl.Transmit(USER_EVENT, VOLUME_MUTE)
            console.log('muted');
            break;
        case RECORD_ERROR:
            ioctl.Transmit(USER_EVENT, RECORD_ERROR);
            console.log('record error!!!');
            break;
        case BLE_ON:
            ioctl.Transmit(USER_EVENT, BLE_ON);
            console.log('turn on bluetooth');
            break;
        case BLE_OFF:
            ioctl.Transmit(USER_EVENT, BLE_OFF)
            console.log('turn off bluetooth');
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
            break;
    }
}


BufferEvents.on('i2c event', async(target, command) => {
    setImmediate(() => {
        Controller(target, command)
    })
})

bluez_event.on('state', async(state) => {
    console.log('bluetooth state: ' + state);
    music_manager.bluePlayer.setState(state)
    if(state == 'playing') {
        music_manager.eventsHandler(events.B_Play)
        music_manager.isMusicPlaying = true
    }
    else//state = paused
        music_manager.isMusicPlaying = false
})


bluez_event.on('finished', async() => {
    console.log('bluez_event: Finishedddd');
    music_manager.eventsHandler(events.B_Finished)
    music_manager.isMusicPlaying = false
})
/**
 * Main: running first
 */

main();