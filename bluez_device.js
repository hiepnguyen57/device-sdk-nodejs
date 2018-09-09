const Agent = require('./Agent.js')
const Adapter = require('./Adapter')
const Device = require('./Device')
const Profile = require('./Profile')
const exec = require("child_process").exec;
const util = require('util');
const dbus = require('dbus-native')
const bus = dbus.systemBus();
var service = bus.getService('org.bluez');

const dbus_ex = require('dbus')
var systembus_ex = dbus_ex.getBus('system');

var adapter = {}

var dbus_getInterface = util.promisify(systembus_ex.getInterface.bind(systembus_ex))

async function bluez_init() {
    var objectManager = await dbus_getInterface('org.bluez', '/', 'org.freedesktop.DBus.ObjectManager')
    var agentManager = await dbus_getInterface('org.bluez', '/org/bluez', 'org.bluez.AgentManager1')
    var profileManager = await dbus_getInterface('org.bluez', '/org/bluez', 'org.bluez.ProfileManager1')
}

// systembus_ex.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.Adapter1', (err, iface) => {
//     if(err) {
//         console.log(err);
//     }
//     iface.setProperty('Powered', 'on')
//     iface.setProperty('Discoverable', 'on')
//     exec('python ./agent.py')
//     console.log('discoverable on successfully');
// }) 

async function getAdapter(dev) {
    const match = dev.match(new RegExp("^/org/bluez/(\\w+)$"));
    if(match) dev = match[1];
    // If the adapter was not discovered jet, try the default path.
    let path = '/org/bluez/' + dev;
    if(adapter[dev]) {
        if(typeof adapter[dev] === "string") {
            path = adapter[dev];
        } else {
            // Adapter already created
            return adapter[dev];
        }
    }
    const interface_ = await dbus_getInterface('org.bluez', path, 'org.bluez.Adapter1').catch((err) => {
        return null
    })

    if(!interface_) throw new Error("Adapter not found");

    adapter[dev] = new Adapter(interface_);
    return adapter[dev];
}

service.getInterface('/', "org.freedesktop.DBus.ObjectManager", (err, iface) => {
    iface.on('InterfacesAdded', async (arg) => {
        console.log('new device connected');
    })
    iface.on("InterfacesRemoved", async(arg) => {
        console.log('device disconnected');
    })
})

const bbbadapter = getAdapter('hci0')
bbbadapter.Powered('on')
bbbadapter.Discoverable('on')
exec('python ./agent.py')
console.log('discoverable on successfully');

//bluez_init()
//bluez_irq()
//     const bbbadapter = getAdapter('hci0')
//     console.log(bbbadapter);
//     // bbbadapter.Powered('on')
//     // bbbadapter.Discoverable('on')
//     exec('python ./agent.py')
//     console.log('discoverable on successfully');

