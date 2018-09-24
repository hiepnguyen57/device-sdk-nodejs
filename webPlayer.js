const Mpg123 = require('./mpg123')

const webPlayerState = {
	idle: 		 0,
	playing: 	 1,
	stopped: 	 2,
	paused: 	 3,
	finished: 	 4,
}

class WebPlayer {
	constructor() {
		this.mpg123 = new Mpg123()
		this.streamURL = null
		this.currState = webPlayerState.idle
		this.volume = 100
		this.volumeIsFaded = false
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

	FadeInVol() {
		if(this.volumeIsFaded == false) {
			while(this.volume > 20) {
				this.volume = this.volume - 5
				this.mpg123.set_volume(this.volume)
			}
			this.volumeIsFaded = true
		}
	}

	FadeOutVol() {
		while(this.volume < 100) {
			this.volume = this.volume + 5
			this.mpg123.set_volume(this.volume)
		}
		this.volumeIsFaded = false
	}
}

module.exports = WebPlayer