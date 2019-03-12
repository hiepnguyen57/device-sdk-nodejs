const Bluez = require('./../bluez/Bluez.js')
const util = require('util');
const exec = require("child_process").exec;
const {spawn} = require('child_process')
const exec_promise = util.promisify(require('child_process').exec);
const current_path = require('path').dirname(require.main.filename)
var EventEmitter = require('events').EventEmitter
const BLE_DISCONNECTED = 'bluetooth_disconnected_322894.wav';


class BlueControl {
	constructor() {
		this.bluetooth = new Bluez()
		this.MacAddress = ''
		this.DevicePath = ''
		this.DeviceName = ''
		this.volBeforeFading = 0
		this.Device = null
		this.bluealsa_aplay = undefined
		this.bluez_event = new EventEmitter()
	}

	async init() {
		await this.bluetooth.init()
		this.Adapter = await this.bluetooth.getAdapter('hci0');
		await this.Adapter.Powered('on')

		this.bluetooth.on('device connected', async(address, obj) => {
			this.MacAddress = address
			this.DevicePath = obj

			this.bluez_event.emit('connected');
			this.Device = await this.bluetooth.getDevice(obj)
			this.DeviceName = await this.Device.Name() + ' - A2DP'
			console.log('New device connected as ' + this.MacAddress);
			console.log('bluealsa control: ' + this.DeviceName);
		})

		this.bluetooth.on('device disconnected', async() => {
			//remove all informations of the old device
			this.MacAddress = ''
			this.DevicePath = ''
			this.Device = null
			this.DeviceName = ''

			this.bluez_event.emit('finished')
			await this.bluealsa_aplay_disconnect()
			await exec(`aplay ${current_path}/../Sounds/${BLE_DISCONNECTED}`)
			console.log('device disconnected');
		})
	}

	async bluealsa_aplay_connect() {
		if((this.bluealsa_aplay === undefined) || (this.bluealsa_aplay.killed === true)){
			if(this.MacAddress != '') {
				console.log('bluealsa-aplay: ' + this.MacAddress);
				this.bluealsa_aplay = exec(`bluealsa-aplay -d bluetooth ${this.MacAddress}`);
			}
		}
	}

	async bluealsa_aplay_disconnect() {
		if (this.bluealsa_aplay != undefined) {
			this.bluealsa_aplay.kill('SIGINT');
		}
	}

	async bluetooth_discoverable(command) {
		if(command == 'on') {
			await this.Adapter.Discoverable('off')
			await this.Adapter.Discoverable('on')
		}
		else {
			await this.bluealsa_aplay_disconnect()
			if(this.Device != null) {
				await this.Device.Disconnect()
			}
			else {
				exec(`aplay ${current_path}/../Sounds/${BLE_DISCONNECTED}`)
			}
			await this.Adapter.Discoverable('off')
		}
	}

	bluealsa_volume_control(input) {
		return new Promise((resolve) => {
			if(this.DeviceName == '') {
				console.log('No device connected!!!');
				return
			}
			else {
				return new Promise(async(resolve) => {
					this.index_string = input.indexOf(" ")
					if(this.index_string >= 0) {
						this.command = input.slice(0, this.index_string)
						this.vol = input.slice(this.index_string + 1, input.length);
					}
					else {
						this.command = input
					}

					switch(this.command) {
						case 'getvolume':
							var {stdout} = await exec_promise(`amixer -D bluealsa sget '${this.DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
							resolve(parseInt(stdout.slice(0, stdout.length - 1)))
							break;

						case 'setvolume':
							exec(`amixer -D bluealsa sset '${this.DeviceName}' ${this.vol}%`)
							console.log('set bluealsa volume as ' + this.vol);
							resolve()
							break;

						case 'fadeInVol':
							var {stdout} = await exec_promise(`amixer -D bluealsa sget '${this.DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
							var fadeinvol = parseInt(stdout.slice(0, stdout.length - 1))
							this.volBeforeFading = fadeinvol

							while(fadeinvol > 30) {
								fadeinvol = fadeinvol - 5
								exec(`amixer -D bluealsa sset '${this.DeviceName}' ${fadeinvol}%`)
							}
							resolve()
							break;

						case 'fadeOutVol':
							var {stdout} = await exec_promise(`amixer -D bluealsa sget '${this.DeviceName}' | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
							var fadeoutvol = parseInt(stdout.slice(0, stdout.length - 1))

							while(fadeoutvol < this.volBeforeFading) {
								fadeoutvol = fadeoutvol + 5
								exec(`amixer -D bluealsa sset '${this.DeviceName}' ${fadeoutvol}%`)
							}
							resolve()
							break;
					}
				})
			}
		})

	}
}

module.exports = BlueControl
