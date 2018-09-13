const Bluez = require('./Bluez')
const bluetooth = new Bluez()
const exec = require("child_process").exec;
const dbus = require('dbus-native')
const bus = dbus.systemBus();
var service = bus.getService('org.bluez');


bluetooth.mediaControl1('/org/bluez/hci0/dev_88_1F_A1_7A_44_29', 'pause')

