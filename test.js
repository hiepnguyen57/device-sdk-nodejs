
// async function set_volume () {
//  var control = await exec(`amixer -D bluealsa scontrols | grep A2DP`)
//  var rl = require('readline').createInterface({input: control.stdout})
//  rl.on('line', async function(line) {
//      var name = line.slice(20, line.length-2)
//      console.log('name: ' + name);
//          exec(`amixer -D bluealsa sset ${name} 50%`)

//  });
// }
const Bluez = require('./bluez/Bluez.js')
const bluetooth = new Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
const util = require('util');

const exec = require("child_process").exec;
const exec_promise = util.promisify(require('child_process').exec);
var EventEmitter = require('events').EventEmitter
var bluez_event = new EventEmitter()

var device_info = {}
device_info.address = ''
device_info.objPath = ''
var device = null
var MacAddress = ''
var volBeforeFading
var bluealsa_aplay_exec

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
		await bluealsa_aplay_connect()
		device = await bluetooth.getDevice(obj)
		bluez_event.emit('fadeinvol')
	})

	bluetooth.on('device disconnected', async() => {
		//remove all informations which device connected
		device_info.address = ''
		device_info.objPath = ''
		MacAddress = ''
		device = null

		await bluealsa_aplay_disconnect()
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
					bluez_event.emit('fadeoutvol')
				}
			})
		})
	})
}

async function get_bluealsa_control() {
	if(device_info.objPath != '') {
		var deviceName = await device.Name() + ' - A2DP'
		//console.log('deviceName: ' + deviceName);
		return deviceName
	}
	else
		console.log('No device connected');
}

function bluealsa_volume_control(input) {
	return new Promise(async(resolve) => {
		var command
		var DeviceName = await get_bluealsa_control()
		console.log('getDeviceName: ' + DeviceName);
		var index_string = input.indexOf(" ")
		if(index_string >= 0) {
			command = input.slice(0, index_string)
		}
		else
			command =  input

		switch(command) {
			case 'fadeInVol':
				var {stdout} = await exec_promise(`amixer -D bluealsa sget '${DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeinvol = parseInt(stdout.slice(0, stdout.length - 1))
				volBeforeFading = fadeinvol
				while(fadeinvol > 30) {
					fadeinvol = fadeinvol - 5
					exec(`amixer -D bluealsa sset '${DeviceName}' ${fadeinvol}%`)
				}
				break;

			case 'fadeOutVol':
				var {stdout} = await exec_promise(`amixer -D bluealsa sget '${DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeoutvol = parseInt(stdout.slice(0, stdout.length - 1))
				console.log('fadeoutvol: ' + fadeoutvol);
				while(fadeoutvol < volBeforeFading) {
					fadeoutvol = fadeoutvol + 5
					exec(`amixer -D bluealsa sset '${DeviceName}' ${fadeoutvol}%`)
				}
				break;
		}
	})
}

async function bluetooth_init() {
	await bluetooth.init()
	exec('python ./agent.py')
	console.log('Agent registered');
	await bluez_handler()
	const adapter = await bluetooth.getAdapter('hci0');
	await adapter.Powered('on');
	await adapter.Discoverable('on')
}

bluez_event.on('fadeinvol', async() => {
	console.log('Event FadeInVol');
	bluealsa_volume_control('fadeInVol')
})
bluez_event.on('fadeoutvol', async() => {
	console.log('Event FadeOutVol');
	bluealsa_volume_control('fadeOutVol')
})
bluetooth_init()

