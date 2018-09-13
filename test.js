const Bluez = require('./Bluez')
const bluetooth = new Bluez()
const exec = require("child_process").exec;
const dbus = require('dbus-native')
const systemBus = dbus.systemBus()
const service = systemBus.getService('org.bluez');

async function bluez_handler() {
	bluetooth.on('device connected', async(address, obj) => {
		console.log('New Device connected as address: ' + address);
	})

	bluetooth.on('device disconnected', async() =>{
		const adapter = await bluetooth.getAdapter('hci0')
		await adapter.Discoverable('off')
		await adapter.Discoverable('on')
		console.log('device disconnected');
	})

	bluetooth.on('update status', async(obj) => {
	    service.getInterface(obj, 'org.freedesktop.DBus.Properties', (err, iface) => {
	        if (err) {
	            console.error()
	        }
	        iface.on('PropertiesChanged', async (signal, status) => {
	            if (status[0][0] == 'Status') {
	                //console.log(status[0][1][1][0]);
	                if (status[0][1][1][0] == 'playing') {
	    					console.log('playing');
	                }
	                else if (status[0][1][1][0] == 'paused') {
	                	console.log('paused');
	                }
	            }
			})
		})
	})
}


bluetooth.init().then(async() => {
   	exec('python ./agent.py')
    console.log('Agent registered');
    await bluez_handler()
    const adapter = await bluetooth.getAdapter('hci0');
    await adapter.Powered('on');
    await adapter.Discoverable('on')
})
