const mpg123_app = require('./mpg123')
// const Event = {
// 	W_PlaybackStarted: 		0,
// 	PlaybackStopped: 		1,
// 	W_PlaybackFailed: 		2,
// 	PlaybackResume: 		3,
// 	PlaybackPaused: 		4,
// 	W_PlaybackFinished: 	5,
// }

const WebPlayerState = {
	idle: 		 0,
	playing: 	 1,
	stopped: 	 2,
	paused: 	 3,
	finished: 	 4,
}

class Playback {
	constructor() {
		this.mpg123 = new mpg123_app()
		this.streamURL = null
		this.currState = WebPlayerState.idle
	}

	Start() {
		if(this.getState() in [WebPlayerState.idle,
					WebPlayerState.paused,
					WebPlayerState.playing,
					WebPlayerState.stopped,
					WebPlayerState.finished]) {
			if(this.streamURL != null) {
				this.mpg123.set_source(this.streamURL)
				this.streamURL = null
				this.setState(WebPlayerState.playing)
				console.log('start playback');
			}
			else
				console.log('invalid url');
		}
	}
	Play() {
		if(this.getState() == WebPlayerState.paused) {
			this.mpg123.play()
			this.setState(WebPlayerState.playing)
		}
	}
	Pause() {
		if(this.getState() == WebPlayerState.playing) {
			this.mpg123.stop()
			this.setState(WebPlayerState.paused)
		}
	}
	Stop() {
		if(this.getState() in [WebPlayerState.playing,
						WebPlayerState.paused]) {
			this.mpg123.stop()
			this.setState(WebPlayerState.stopped)
		}
	}
	Error() {
		if(this.getState() == WebPlayerState.playing) {
			this.setState(WebPlayerState.stopped)
		}
	}
	getState() {
		return this.currState
	}
	setState(state) {
		this.currState = state
	}
}
class WebPlayer {
	constructor() {
		this.playback_object = new Playback()
	}
}
module.exports = WebPlayer