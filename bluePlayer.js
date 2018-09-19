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

		}
	}

	Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blepause')
				this.setState('paused')
			}

		}
	}

	Stop() {
		var state = this.getState()
		if(state = bluePlayerState.playing) {
			if(device_info.objPath != '') {
				this.bluetooth.setMediaControl(objPath, 'blestop')
				this.setState('stopped')
			}
		}
	}
}

// class BluePlayer {
// 	constructor() {
// 		this.playback_object = new Playback()
// 		// this.eventGroup = {
// 		// 	Event.StatusChanged: 	this.playback_object.setState,
// 		// 	Event.PlaybackResumed: 	this.playback_object.Play(),
// 		// 	Event.PlaybackStopped: 	this.playback_object.Stop(),
// 		// 	Event.PlaybackPaused: 	this.playback_object.Pause(),
// 		// }
// 	}
// }
module.exports = BluePlayer
