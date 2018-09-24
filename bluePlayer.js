var bluetooth = require('./bluetooth').bluetooth
var device_info = require('./bluetooth').device_info
var bluealsa_volume_control = require('./bluetooth').bluealsa_volume_control
var bluealsa_aplay_connect = require('./bluetooth').bluealsa_aplay_connect
var bluealsa_aplay_disconnect = require('./bluetooth').bluealsa_aplay_disconnect

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

class BluePlayer {
	constructor() {
		this.bluetooth = bluetooth
		this.currState = bluePlayerState.idle
		this.volumeIsFaded = false
	}

	setState(state) {
		this.currState = stateGroup[state]
	}

	getState() {
		return this.currState
	}

	async Play() {
		var state = this.getState()
		if((state == bluePlayerState.paused) || (state == bluePlayerState.idle)) {
			//console.log('objPath: ' + device_info.objPath);
			if(device_info.objPath != '')
			{
				//need to fix when bluealsa support dmix
				await bluealsa_aplay_connect()
				this.bluetooth.setMediaControl(device_info.objPath, 'play')
				this.setState('playing')
			}
			else
				console.log('no device connected');
		}
	}

	async Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			//console.log('objPath: ' + device_info.objPath);
			if(device_info.objPath != '') {
				//need to fix when bluealsa support dmix
				await bluealsa_aplay_disconnect()
				this.bluetooth.setMediaControl(device_info.objPath, 'pause')
				this.setState('paused')
			}
			else
				console.log('no device connected');
		}
	}

	async Stop() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			//console.log('objPath: ' + device_info.objPath);
			if(device_info.objPath != '') {
				//need to fix when bluealsa support dmix
				await bluealsa_aplay_disconnect()
				this.bluetooth.setMediaControl(device_info.objPath, 'stop')
				this.setState('stopped')
			}
			else
				console.log('no device connected');
		}
	}

	FadeInVol() {
		if(this.volumeIsFaded == false) {
			bluealsa_volume_control('fadeInVol')
			this.volumeIsFaded = true
		}
	}

	FadeOutVol() {
		bluealsa_volume_control('fadeOutVol')
		this.volumeIsFaded = false
	}
}

module.exports = BluePlayer
