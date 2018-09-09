const Bluez = require('./Bluez')
const bluetooth = new Bluez()
const exec = require("child_process").exec;
const dbus = require('dbus-native')
const bus = dbus.systemBus();
var service = bus.getService('org.bluez');

bluetooth.init().then(async() => {

    // listen on first bluetooth adapter
    // const adapter = await bluetooth.getAdapter('hci0');
    // await adapter.Powered('on');
    // await adapter.Discoverable('on')
    // console.log("Powered and Discoverable on");
   	// exec('python ./agent.py')
    // console.log('Agent registered');
    await bluetooth.mediaController('/org/bluez/hci0/dev_A0_28_ED_AB_59_E1', 'pause')
})

