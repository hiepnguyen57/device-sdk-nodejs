const Bluez = require('./bluez/Bluez.js')
const bluetooth = new Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
const util = require('util');
const exec = require("child_process").exec;
const {spawn} = require('child_process')
const exec_promise = util.promisify(require('child_process').exec);
const current_path = require('path').dirname(require.main.filename)
var EventEmitter = require('events').EventEmitter
var bluez_event = new EventEmitter()

var device_info = {}
device_info.address = ''
device_info.objPath = ''

var DeviceName = ''
var bluealsa_aplay_exec
var device = null
var MacAddress = ''

const VA_BLE_CONNECTED = 'VA_bluetooth_connected.wav';
const BLE_CONNECTED = 'bluetooth_connected_322896.wav';
const BLE_DISCONNECTED = 'bluetooth_disconnected_322894.wav';
var volBeforeFading

async function bluealsa_aplay_connect() {
	if (bluealsa_aplay_exec == undefined) {
		if(MacAddress != '') {
			console.log('bluealsa-aplay: ' + MacAddress);
			bluealsa_aplay_exec = exec(`bluealsa-aplay -d bluetooth ${MacAddress}`);
		}
	}
	else {
		if (bluealsa_aplay_exec.killed == true) {
			if(MacAddress != '') {
				console.log('bluealsa-aplay: ' + MacAddress);
				bluealsa_aplay_exec = exec(`bluealsa-aplay -d bluetooth ${MacAddress}`);
			}
		}
	}
}


async function bluealsa_aplay_disconnect() {
	if (bluealsa_aplay_exec != undefined) {
		bluealsa_aplay_exec.kill('SIGINT');
	}
}

async function bluez_handler() {
	bluetooth.on('device connected', async(address, obj) => {
		device_info.address = address
		device_info.objPath = obj
		MacAddress = address

		bluez_event.emit('connected');
		device = await bluetooth.getDevice(obj)
		//exec(`aplay ${current_path}/Sounds/${VA_BLE_CONNECTED}`)
		// setTimeout(async() => {
		// //get device name
		// 	device_name = await device.Name() + ' - A2DP'
		// 	console.log('device name: ' + device_name);
		// }, 100);
		DeviceName = await device.Name() + ' - A2DP'
		console.log('New device connected as ' + device_info.address);
		console.log('bluealsa control: ' + DeviceName);

	})

	bluetooth.on('device disconnected', async() => {
		//remove all informations which device connected
		device_info.address = ''
		device_info.objPath = ''
		MacAddress = ''
		device = null
		DeviceName = ''
		await bluealsa_aplay_disconnect()
		await exec(`aplay ${current_path}/Sounds/${BLE_DISCONNECTED}`)
		bluez_event.emit('finished')
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
					bluez_event.emit('state', state)
					console.log('update state: ' + state);
				}
			})
		})
	})
}

async function bluetooth_init() {
	await bluetooth.init()
	await bluez_handler()
	const adapter = await bluetooth.getAdapter('hci0');
	await adapter.Powered('on');
}

async function bluetooth_discoverable(command) {
	const adapter = await bluetooth.getAdapter('hci0')
	if(command == 'on') {
		await adapter.Discoverable('off')
		await adapter.Discoverable('on')
	}
	else {//command = 'off'
		await bluealsa_aplay_disconnect()
		if(device != null) {
			await device.Disconnect()
		}
		else
			exec(`aplay ${current_path}/Sounds/${BLE_DISCONNECTED}`)
		await adapter.Discoverable('off')
	}
}

// async function get_bluealsa_control() {
// 	if(device_info.objPath != '') {
// 		var deviceName = await device.Name() + ' - A2DP'
// 		//console.log('deviceName: ' + deviceName);
// 		return deviceName
// 	}
// 	else
// 		console.log('No device connected');
// }

function bluealsa_volume_control(input) {
	if(DeviceName == '') {
		console.log('No device connected!!!');
		return
	}
	else {
		return new Promise(async(resolve) => {
			var command, vol
			//var DeviceName = await get_bluealsa_control()
			//console.log('DeviceName: ' + DeviceName);
			var index_string = input.indexOf(" ")
			if(index_string >= 0) {
				command = input.slice(0, index_string)
				vol = input.slice(index_string + 1, input.length);
			}
			else {
				command =  input
			}

			switch(command) {
				case 'getvolume':
					var {stdout} = await exec_promise(`amixer -D bluealsa sget '${DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
					resolve(parseInt(stdout.slice(0, stdout.length - 1)))
					break;

				case 'setvolume':
					exec(`amixer -D bluealsa sset '${DeviceName}' ${vol}%`)
					console.log('set bluealsa volume as ' + vol);
					resolve()
					break;

				case 'fadeInVol':
					var {stdout} = await exec_promise(`amixer -D bluealsa sget '${DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
					var fadeinvol = parseInt(stdout.slice(0, stdout.length - 1))
					volBeforeFading = fadeinvol

					while(fadeinvol > 30) {
						fadeinvol = fadeinvol - 5
						exec(`amixer -D bluealsa sset '${DeviceName}' ${fadeinvol}%`)
					}
					resolve()
					break;

				case 'fadeOutVol':
					var {stdout} = await exec_promise(`amixer -D bluealsa sget '${DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
					var fadeoutvol = parseInt(stdout.slice(0, stdout.length - 1))

					while(fadeoutvol < volBeforeFading) {
						fadeoutvol = fadeoutvol + 5
						exec(`amixer -D bluealsa sset '${DeviceName}' ${fadeoutvol}%`)
					}
					resolve()
					break;
			}
		})
	}
}

module.exports = {
	bluealsa_aplay_connect: 		bluealsa_aplay_connect,
	bluealsa_aplay_disconnect: 		bluealsa_aplay_disconnect,
	device_info: 					device_info,
	bluez_event: 					bluez_event,
	bluetooth_discoverable: 		bluetooth_discoverable,
	bluetooth_init: 				bluetooth_init,
	bluetooth: 						bluetooth,
	bluealsa_volume_control: 		bluealsa_volume_control
}