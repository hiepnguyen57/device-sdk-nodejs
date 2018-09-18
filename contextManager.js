const bluePlayer = require('./bluePlayer')
const webPlayer = require('./webPlayer')
const events = require('./mp_events')

const Event = {
	Resume: 0,
	Pause: 1,
	Stop: 2,
	Next: 3,
	Prev: 4,
	W_NewSong: 5,
	B_Play: 6,
	B_Finished: 7,
	SetVolume: 8,
	FadeInVolume: 9,
	FadeOutVolume: 10,
	VolumeUp: 11,
	VolumeDown: 12,
}

var context_manger =  null

function isWebActive(object) {
	if(object.activeState == events.PlayerState.webActive) {
		return true
	}
	else
		return false
}

function isBluetoothActive(object) {
	if(object.activeState == events.PlayerState.bluetoothActive) {
		return true
	}
	else
		return false
}

class ContextManager {
	constructor() {
		this.activeState = events.PlayerState.webActive
		this.url = ''
		this.volume = 0
		this.webPlayer = new webPlayer()
		this.bluePlayer = new bluePlayer()
		this.bluePlayer.init()
	}

	switchContext(newEvent) {
		if(newEvent == Event.B_Play) {
			if(isWebActive(this)) {
				this.activeState = events.PlayerState.bluetoothActive
				console.log('pause web player');
			}
		}
		else if(newEvent == Event.B_Finished) {
			if(isBluetoothActive(this)) {
				this.activeState = events.PlayerState.webActive
				console.log('the priority goes to web player');
			}
		}
		else if(newEvent == Event.W_NewSong) {
			console.log('new song');
			if(isBluetoothActive(this)) {
				this.activeState = events.PlayerState.webActive
				console.log('pause bluetooth player');
			}
		}
		else
			console.log('remain the same priority');
	}

	eventsHandler(newEvent) {
		this.switchContext(newEvent)
		console.log(this.activeState);

		switch(newEvent) {
			case Event.Resume:
				events.ResumeHandler(this)
				break;
			case Event.Pause:
				events.PauseHandler(this)
				break;
			case Event.Stop:
				events.StopHandler(this)
				break;
			case Event.Next:
				events.NextHandler(this)
				break;
			case Event.Prev:
				events.PrevHandler(this)
				break;
			case Event.W_NewSong:
				events.W_NewSongHandler(this)
				break;
			case Event.B_Play:
				events.B_PlayHandler(this)
				break;
			case Event.B_Finished:
				events.B_FinishedHandler(this)
				break;

		}
	}

}

function getContextManager() {
	if(context_manger == null) {
		context_manager = new ContextManager()
	}
	return context_manger
}

module.exports.getContextManager = getContextManager
module.exports.Event = Event