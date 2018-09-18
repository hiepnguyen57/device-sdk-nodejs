const Bluez = require('./bluez/Bluez')
const exec = require("child_process").exec;
var device_info = require('./bluetooth_irq').device_info

const Event = {
	//B_PlaybackReady: 0,
	StatusChanged: 		1,
	PlaybackPaused: 	2,
	PlaybackResumed: 	3,
	PlaybackStopped: 	4
}
const bluePlayerState = {
	idle: 			1,
	playing: 		2,
	paused: 		3,
	error: 			4,
}
const stateGroup = {
	'idle': 	bluePlayerState.idle,
	'playing':	bluePlayerState.playing,
	'paused': 	bluePlayerState.paused,
	'stopped': 	bluePlayerState.paused,
}

var bluealsa_aplay_exec

class Playback {
	constructor() {
		this.bluetooth = new Bluez()
		this.currState = bluePlayerState.idle
	}

	async init() {
		await this.bluetooth.init()
		await exec('python ./agent.py')

		await this.adapter = this.bluetooth.getAdapter('hci0')
		await this.adapter.Powered('on')
		console.log('Bluetooth power on');
	}

	setSate(state) {
		this.currState = stateGroup.state
	}

	getState() {
		return this.currState
	}
	Play() {
		var state = this.getState()
		if(state in [bluePlayerState.paused, bluePlayerState.idle]) {
			if(device_info.objPath != '')
			{
				this.bluetooth.setMediaControl(objPath, 'bleplay')
				this.setState(playing)
			}

		}
	}
	Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blepause')
				this.setState(paused)
			}

		}
	}
	Stop() {
		var state = this.getState()
		if(state = bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blestop')
				this.setState(stopped)
			}
		}
	}

	bluealsa_aplay_connect() {
		if(bluealsa_aplay_exec == undefined) {
			if(device_info.address != '') {
				bluealsa_aplay_exec = exec(`bluealsa_aplay ${device_info.address}`)
				console.log('bluealsa_aplay ' + device_info.address);
			}
		}
		else{
			if(bluealsa_aplay_exec.killed == true) {
				if(device_info.address != '') {
					bluealsa_aplay_exec = exec(`bluealsa_aplay ${device_info.address}`)
					console.log('bluealsa_aplay ' + device_info.address);
				}
			}
		}
	}

	bluealsa_aplay_disconnect() {
		if(bluealsa_aplay_exec != undefined) {
			bluealsa_aplay_exec.kill('SIGINT')
			console.log('bluealsa_aplay disconnected');
		}
	}
}

class BluePlayer {
	constructor() {
		this.playback_object = new Playback()
		// this.eventGroup = {
		// 	Event.StatusChanged: 	this.playback_object.setState,
		// 	Event.PlaybackResumed: 	this.playback_object.Play(),
		// 	Event.PlaybackStopped: 	this.playback_object.Stop(),
		// 	Event.PlaybackPaused: 	this.playback_object.Pause(),
		// }
	}
}
module.exports = BluePlayer
