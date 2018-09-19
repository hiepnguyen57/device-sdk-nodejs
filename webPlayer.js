const mpg123_app = require('./mpg123')
// const Event = {
// 	W_PlaybackStarted: 		0,
// 	PlaybackStopped: 		1,
// 	W_PlaybackFailed: 		2,
// 	PlaybackResume: 		3,
// 	PlaybackPaused: 		4,
// 	W_PlaybackFinished: 	5,
// }

const webPlayerState = {
	idle: 		 0,
	playing: 	 1,
	stopped: 	 2,
	paused: 	 3,
	finished: 	 4,
}

class WebPlayer {
	constructor() {
		this.mpg123 = new mpg123_app()
		this.streamURL = null
		this.currState = webPlayerState.idle
	}

	Start() {
		if(this.getState() in [webPlayerState.idle,
					webPlayerState.paused,
					webPlayerState.playing,
					webPlayerState.stopped,
					webPlayerState.finished]) {
			if(this.streamURL != null) {
				this.mpg123.set_source(this.streamURL)
				this.streamURL = null
				this.setState(webPlayerState.playing)
				console.log('start playback');
			}
			else
				console.log('invalid url');
		}
	}
	Play() {
		if(this.getState() == webPlayerState.paused) {
			this.mpg123.play()
			this.setState(webPlayerState.playing)
		}
	}
	Pause() {
		if(this.getState() == webPlayerState.playing) {
			this.mpg123.pause()
			this.setState(webPlayerState.paused)
		}
	}
	Stop() {
		if(this.getState() in [webPlayerState.playing,
						webPlayerState.paused]) {
			this.mpg123.stop()
			this.setState(webPlayerState.stopped)
		}
	}
	Error() {
		if(this.getState() == webPlayerState.playing) {
			this.setState(webPlayerState.stopped)
		}
	}
	getState() {
		return this.currState
	}
	setState(state) {
		this.currState = state
	}
}
// class WebPlayer {
// 	constructor() {
// 		this.playback_object = new Playback()
// 	}
// }
module.exports = WebPlayer