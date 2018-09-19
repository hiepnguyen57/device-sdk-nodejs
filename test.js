const Bluez = require('./bluez/Bluez')
const bluetooth = new Bluez()
const dbus = require('dbus-native')
const systemBus =  dbus.systemBus()
var service = systemBus.getService('org.bluez')
const exec = require("child_process").exec;
var device_info = {}

device_info.address = ''
device_info.objPath = ''

function bluetooth_handler() {
    bluetooth.on('device connected', async(address, obj) => {
        console.log('New device connected as ' + address);
        device_info.address = address
        device_info.objPath = obj
    })

    bluetooth.on('device disconnected', async() => {
        device_info.address = ''
        device_info.objPath = ''
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

                    //console.log(status[0][1][1][0]);
                    if (status[0][1][1][0] == 'playing') {
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

async function bluetooth_init () {
    await bluetooth.init()
    exec('python ./agent.py')
    console.log('Agent registered');
    await bluetooth_handler()
    const adapter = await bluetooth.getAdapter('hci0');
    await adapter.Powered('on');
    await adapter.Discoverable('on')
}
module.exports.bluetooth = bluetooth
module.exports.bluetooth_init = bluetooth_init
module.exports.device_info = device_info
