const Bluez = require('./bluez/Bluez.js')
const bluetooth = new Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
const exec = require("child_process").exec;

var device_info = {}
device_info.address = ''
device_info.objPath = ''
var bluealsa_aplay_exec

const music_player = require('./music_player').getMusicManager()
const events = require('./music_player').events
var device = null

function bluealsa_aplay_connect() {
	if(bluealsa_aplay_exec == undefined) {
		if(device_info.address != '') {
			bluealsa_aplay_exec = exec(`bluealsa_aplay ${device_info.address}`)
			console.log('bluealsa_aplay ' + device_info.address);
		}
	}
	else{
		if(bluealsa_aplay_exec.killed == true) {
			if(device_info.address != '') {
				bluealsa_aplay_exec = exec(`bluealsa_aplay ${device_info.address}`)
				console.log('bluealsa_aplay ' + device_info.address);
			}
		}
	}
}

function bluealsa_aplay_disconnect() {
	if(bluealsa_aplay_exec != undefined) {
		bluealsa_aplay_exec.kill('SIGINT')
		console.log('bluealsa_aplay disconnected');
	}
}

async function bluez_handler() {
	bluetooth.on('device connected', async(address, obj) => {
		device_info.address = address
		device_info.objPath = obj
		await bluealsa_aplay_connect()
		console.log('New device connected as ' + address);
	})

	bluetooth.on('device disconnected', async() => {
		device_info.address = ''
		device_info.objPath = ''
		device = null

		music_player.eventsHandler(events.B_Finished)
		bluealsa_aplay_disconnect()
		console.log('device disconnected');
	})

	bluetooth.on('update status', async(obj) => {
		service.getInterface(obj, 'org.freedesktop.DBus.Properties', (err, notification) => {
			if(err) {
				console.error(err)
			}

			notification.on('PropertiesChanged', async (signal, status) => {
				if (status[0][0] == 'Status') {
					var state = status[0][1][1][0]
					console.log('state update: ' + state);
					music_player.bluePlayer.setState(state)//fix here
					//console.log(status[0][1][1][0]);
					if (status[0][1][1][0] == 'playing') {
						music_player.eventsHandler(events.B_Play)
						console.log('update status: playing');
					}
					else if (status[0][1][1][0] == 'paused') {
						console.log('update status: paused');
					}
				}
			})
		})
	})
}

async function bluetooth_init() {
    await bluetooth.init()
    exec('python ./agent.py')
    console.log('Agent registered');
    //await bluez_handler()
    const adapter = await bluetooth.getAdapter('hci0');
    await adapter.Powered('on');
}

// async function set_bluetooth_discoverable(command) {
// 	const adapter = await bluetooth.getAdapter('hci0')
// 	if(command == 'on') {
// 		await adapter.Discoverable('on')
// 	}
// 	else {//command = 'off'
// 		if(device != null && device_info.objPath != '') {
// 			device = await bluetooth.getDevice(device_info.objPath)
// 			await device.Disconnect()
// 		}
// 		await adapter.Discoverable('off')
// 	}
// }

module.exports.music_player = music_player
//module.exports.set_bluetooth_discoverable = set_bluetooth_discoverable
module.exports.device_info = device_info
module.exports.bluetooth_init = bluetooth_init
module.exports.bluetooth = bluetooth