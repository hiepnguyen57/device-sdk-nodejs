var BlueControl = require('./bluetooth.js')

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
		this.bluecontrol = new BlueControl()
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
			//console.log('objPath: ' + this.bluecontrol.DevicePath);
			if(this.bluecontrol.DevicePath != '')
			{
				//need to fix when bluealsa support dmix
				await this.bluecontrol.bluealsa_aplay_connect()
				this.bluecontrol.bluetooth.setMediaControl(this.bluecontrol.DevicePath, 'play')
				this.setState('playing')
			}
			else
				console.log('no device connected');
		}
	}

	async Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			//console.log('objPath: ' + this.bluecontrol.DevicePath);
			if(this.bluecontrol.DevicePath != '') {
				//need to fix when bluealsa support dmix
				await this.bluecontrol.bluealsa_aplay_disconnect()
				this.bluecontrol.bluetooth.setMediaControl(this.bluecontrol.DevicePath, 'pause')
				this.setState('paused')
			}
			else
				console.log('no device connected');
		}
	}

	async Stop() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			//console.log('objPath: ' + this.bluecontrol.DevicePath);
			if(this.bluecontrol.DevicePath != '') {
				//need to fix when bluealsa support dmix
				await this.bluecontrol.bluealsa_aplay_disconnect()
				this.bluetooth.setMediaControl(this.bluecontrol.DevicePath, 'stop')
				this.setState('stopped')
			}
			else
				console.log('no device connected');
		}
	}

	FadeInVol() {
		if(this.volumeIsFaded == false) {
			this.bluecontrol.bluealsa_volume_control('fadeInVol')
			this.volumeIsFaded = true
		}
	}

	FadeOutVol() {
		this.bluecontrol.bluealsa_volume_control('fadeOutVol')
		this.volumeIsFaded = false
	}
}

module.exports = BluePlayer
