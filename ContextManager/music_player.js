const BluePlayer = require('./../AudioPlayer/bluePlayer')
const WebPlayer = require('./../AudioPlayer/webPlayer')
const mp_events = require('./mp_events')
const exec = require("child_process").exec;
const current_path = require('path').dirname(require.main.filename)

var music_manger =  null

const events = {
	Resume: 		0,
	Pause: 			1,
	Stop: 			2,
	Next: 			3,
	Prev: 			4,
	W_NewSong: 		5,
	B_Play: 		6,
	B_Finished: 	7,
	SetVolume: 		8,
	FadeInVolume: 	9,
	FadeOutVolume: 	10,
	VolumeUp: 		11,
	VolumeDown: 	12,
}


function isWebActive(object) {
	if(object.activeState == mp_events.playerState.webActive) {
		return true
	}
	else
		return false
}

function isBluetoothActive(object) {
	if(object.activeState == mp_events.playerState.bluetoothActive) {
		return true
	}
	else
		return false
}

class MusicManager {
	constructor() {
		this.activeState = mp_events.playerState.webActive
		this.url = ''
		this.webPlayer = new WebPlayer()
		this.bluePlayer = new BluePlayer()
		this.isMusicPlaying = false
		this.isBluePlaying = false
		this.isBlueResume = false
	}

	async init() {
		await this.bluePlayer.bluecontrol.init()

		this.bluePlayer.bluecontrol.bluez_event.on('connected', async() => {
			this.eventsHandler(events.FadeInVolume)
			setTimeout(async() => {
				//new device notification
				exec(`aplay ${current_path}/../Sounds/${'VA_bluetooth_connected.wav'}`).on('exit', () => {
					this.eventsHandler(events.FadeOutVolume)
				})
			}, 100);
		})

		this.bluePlayer.bluecontrol.bluez_event.on('finished', async() => {
			this.eventsHandler(events.B_Finished)
			if(this.isBluePlaying == true) {
				this.isMusicPlaying = false
				this.isBlueResume = true
			}
			else {
				this.isBlueResume = false
			}
			this.isBluePlaying = false
		})

		this.bluePlayer.bluecontrol.bluetooth.on('update state', async(state) => {
			console.log('bluetooth state: ' + state)
			//auto update state of Bluetooth
			this.bluePlayer.setState(state)
			if(state == 'playing') {
				//need to fix when bluealsa support dmix
				await this.bluePlayer.bluecontrol.bluealsa_aplay_connect()
				this.eventsHandler(events.B_Play)
				this.isMusicPlaying = true
				this.isBluePlaying = true
			}
			else {//state = paused or stopped
				//need to fix when bluealsa support dmix
				await this.bluePlayer.bluecontrol.bluealsa_aplay_disconnect()
				this.isMusicPlaying = false
				this.isBluePlaying = false
			}
		})
	}

	switchContext(newEvent) {
		if(newEvent == events.B_Play) {
			if(isWebActive(this)) {
				this.webPlayer.Pause()
				this.activeState = mp_events.playerState.bluetoothActive
				console.log('pause web player');
			}
		}
		else if(newEvent == events.B_Finished) {
			if(isBluetoothActive(this)) {
				this.activeState = mp_events.playerState.webActive
				console.log('the priority goes to web player');
			}
		}
		else if(newEvent == events.W_NewSong) {
			console.log('new song');
			if(isBluetoothActive(this)) {
				this.bluePlayer.Pause()
				this.activeState = mp_events.playerState.webActive
				console.log('pause bluetooth player');
			}
		}
		else
			console.log('remain the same priority below');
	}

	eventsHandler(newEvent) {
		this.switchContext(newEvent)
		console.log(this.activeState);

		switch(newEvent) {
			case events.Resume:
				mp_events.ResumeHandler(this)
				this.isMusicPlaying = true
				break;
			case events.Pause:
				mp_events.PauseHandler(this)
				this.isMusicPlaying = false
				break;
			case events.Stop:
				mp_events.StopHandler(this)
				this.isMusicPlaying = false
				break;
			case events.Next:
				mp_events.NextHandler(this)
				break;
			case events.Prev:
				mp_events.PrevHandler(this)
				break;
			case events.W_NewSong:
				mp_events.W_NewSongHandler(this)
				this.isMusicPlaying = true
				break;
			case events.B_Play:
				mp_events.B_PlayHandler(this)
				break;
			case events.B_Finished:
				mp_events.B_FinishedHandler(this)
				break;
			case events.FadeInVolume:
				mp_events.FadeInVolume(this)
				break;
			case events.FadeOutVolume:
				mp_events.FadeOutVolume(this)
				break;
			default:
				console.log('nothing event here');
				break;
		}
	}

}

function getMusicManager() {
	if(music_manger == null) {
		music_manger = new MusicManager()
	}
	return music_manger
}

module.exports.getMusicManager = getMusicManager
module.exports.events = events