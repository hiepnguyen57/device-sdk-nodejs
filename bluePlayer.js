var device_info = require('./bluetooth').device_info
var bluetooth = require('./bluetooth').bluetooth

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


class BluePlayer {
	constructor() {
		this.bluetooth = bluetooth
		this.currState = bluePlayerState.idle
	}

	setState(state) {
		this.currState = stateGroup[state]
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
				this.setState('playing')
			}
			else
				console.log('no device connected');
		}
	}

	Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blepause')
				this.setState('paused')
			}
			else
				console.log('no device connected');
		}
	}

	Stop() {
		var state = this.getState()
		if(state = bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blestop')
				this.setState('stopped')
			}
			else
				console.log('no device connected');
		}
	}
}

module.exports = BluePlayer
