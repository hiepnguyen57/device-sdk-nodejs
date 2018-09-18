const Bluez = require('./bluez/Bluez')
const bluetooth = Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
var device_info = {}
const contextManager = require('./contextManager').getContextManager()
const Event = require('./contextManager').Event
function bluetooth_handler() {
	bluetooth.on('device connected', async(address, obj) => {
		device_info.address = address
		device_info.objPath = obj
		console.log('New device connected as ' + address);
	})

	bluetooth.on('device disconnected', async() => {
		device_info.address = ''
		device_info.objPath = ''

		contextManager.eventsHandler(Event.B_Finished)
		console.log('device disconnected');
	})
	bluetooth.on('update status', async(obj) => {
		console.log('device object path: ' + obj);

		service.getInterface(obj, 'org.freedesktop.DBus.Properties', (err, notification) => {
			if(err) {
				console.error(err)
			}

			notification.on('PropertiesChanged', async (signal, status) => {
				if (status[0][0] == 'Status') {
					var state = status[0][1][1][0]
					console.log('state update: ' + state);
					contextManager.bluePlayer.playback_object.setState(state)//fix here
					//console.log(status[0][1][1][0]);
					if (status[0][1][1][0] == 'playing') {
						contextManager.eventsHandler(Event.B_Play)
						console.log('update status: playing');
					}
					else if (status[0][1][1][0] == 'paused') {
						console.log('update status: paused');
					}
				}
			})
		})
	}
}
module.exports.contextManager = contextManager

module.exports.device_info = device_info
module.exports.bluetooth_handler = bluetooth_handler