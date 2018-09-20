const BluePlayer = require('./bluePlayer')
const WebPlayer = require('./webPlayer')
const mp_events = require('./mp_events')
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