const Bluez = require('./bluez/Bluez.js')
const bluetooth = new Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
const exec = require("child_process").exec;
const current_path = require('path').dirname(require.main.filename)
var EventEmitter = require('events').EventEmitter
var bluez_event = new EventEmitter()

var device_info = {}
device_info.address = ''
device_info.objPath = ''

var bluealsa_aplay_exec
var device = null
var MacAddress = ''

const VA_BLE_CONNECTED = 'VA_bluetooth_connected.wav';
const BLE_CONNECTED = 'bluetooth_connected_322896.wav';
const BLE_DISCONNECTED = 'bluetooth_disconnected_322894.wav';


async function bluealsa_aplay_connect() {
	if (bluealsa_aplay_exec == undefined) {
		if(MacAddress != '') {
			console.log('bluealsa-aplay: ' + MacAddress);
			bluealsa_aplay_exec = exec(`bluealsa-aplay ${MacAddress}`);
		}
	}
	else {
		if (bluealsa_aplay_exec.killed == true) {
			if(MacAddress != '') {
				console.log('bluealsa-aplay: ' + MacAddress);
				bluealsa_aplay_exec = exec(`bluealsa-aplay ${MacAddress}`);
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

		console.log('New device connected as ' + device_info.address);
		await exec(`aplay ${current_path}/Sounds/${VA_BLE_CONNECTED}`)
		await bluealsa_aplay_connect()
		device = await bluetooth.getDevice(obj)
	})

	bluetooth.on('device disconnected', async() => {
		//remove informations which device connected
		device_info.address = ''
		device_info.objPath = ''
		MacAddress = ''
		device = null

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
					console.log('update state: ' + state);
					bluez_event.emit('state', state)
				}
			})
		})
	})
}

async function bluetooth_init() {
	await bluetooth.init()
	exec('python ./agent.py')
	console.log('Agent registered');
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
		if(device != null) {
			await device.Disconnect()
		}
		else
			await exec(`aplay ${current_path}/Sounds/${BLE_DISCONNECTED}`)
		await adapter.Discoverable('off')
	}
}

module.exports.device_info = device_info
module.exports.bluez_event = bluez_event
module.exports.bluetooth_discoverable = bluetooth_discoverable
module.exports.bluetooth_init = bluetooth_init
module.exports.bluetooth = bluetooth