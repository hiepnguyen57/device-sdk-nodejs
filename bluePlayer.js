//const Bluez = require('./bluez/Bluez')
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

//console.log(stateGroup.stopped);
class Playback {
	constructor() {
		// this.options = Object.assign({

		// }, options);
		this.currState = bluePlayerState.idle
	}

	setSate(state) {
		this.currState = stateGroup.state
	}

	getState() {
		return this.currState
	}
	// init() {
	// 	async function bluez_handler() {
	// 	    bluetooth.on('device connected', async(address, obj) => {
	// 	        //update new address and obj path when new device connect to speaker
	// 	        objDevicePath = obj
	// 	        MacAddress = address
	// 	        device = await bluetooth.getDevice(objDevicePath)
	// 	        console.log('New device connected as address: ' + address);
	// 	    })

	//     	bluetooth.on('device disconnected', async() => {
	//     	    console.log('device disconnected');

	//     	    //remove old address and obj path
	//     	    MacAddress = ''
	//     	    objDevicePath = ''
	//     	    device = null
	//     	})

	//     	bluetooth.on('update status', async(obj) => {
	//     	    service.getInterface(obj, 'org.freedesktop.DBus.Properties', (err, iface) => {
	//     	        if (err) {
	//     	            console.error()
	//     	        }
	//     	        iface.on('PropertiesChanged', async (signal, status) => {
	//     	            if (status[0][0] == 'Status') {
	//     	                //console.log(status[0][1][1][0]);
	//     	                if (status[0][1][1][0] == 'playing') {
	//     	                    console.log('update status: playing');
	//     	                }
	//     	                else if (status[0][1][1][0] == 'paused') {
	//     	                    console.log('update status: paused');
	//     	                }
	//     	            }
	//     	        })
	//     	    })
	//     	})
	// 	}
	// }
	Play() {
		var state = this.getState()
		if(state == bluePlayerState.paused) {
//			setMediaControl(objDevicePath, 'bleplay')
			this.setState(playing)
		}
	}
	Pause() {
		var state = this.getState()
		if(state == bluePlayerState.playing) {
			this.setState(paused)
		}
	}
	Stop() {
		var state = this.getState()
		if(state = bluePlayerState.playing) {
			this.setState(stopped)
		}
	}
}

class BluePlayer {
	constructor() {
		this.playback_object = new Playback()
		this.eventGroup = {
			Event.StatusChanged: 	this.playback_object.setState,
			Event.PlaybackResumed: 	this.playback_object.Play(),
			Event.PlaybackStopped: 	this.playback_object.Stop(),
			Event.PlaybackPaused: 	this.playback_object.Pause(),
		}
	}
}
module.exports = BluePlayer
