const EventEmitter = require('events').EventEmitter;
const util = require('util');
const DBus = require('dbus');
const dbus = require('dbus-native')
const Adapter = require('./Adapter');
const Device = require('./Device');
const Agent = require('./Agent');
const Profile = require('./Profile');
var bluez_update = new EventEmitter()

var ignore_device_signal = false
var ignore_status_signal = false

class Bluez extends EventEmitter {
    constructor(options) {
        super();
        this.options = Object.assign({
            service: null, // connection local service
            objectPath: "/tmp/agent" // implement for generating agent
        }, options);
        this.systemBus = dbus.systemBus()
        this.service = this.systemBus.getService('org.bluez')
        this.getInterface = util.promisify(this.service.getInterface.bind(this.service));
        this.bus = DBus.getBus('system')
        this.DbusgetInterface = util.promisify(this.bus.getInterface.bind(this.bus));
        this.adapter = {};
        this.devices = {};
    }

    async init() {
        //this.objectManager = await this.getInterface('/', 'org.freedesktop.DBus.ObjectManager')
        //this.agentManager = await this.DbusgetInterface('org.bluez', '/org/bluez', 'org.bluez.AgentManager1');
        //this.profileManager = await this.getInterface('org.bluez', '/org/bluez', 'org.bluez.ProfileManager1');
        this.service.getInterface('/', 'org.freedesktop.DBus.ObjectManager', (err, objectManager) => {
            if(err) {
                console.error(err);
            }

            objectManager.on('InterfacesAdded', async(path) => {
                const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/(((player)|(fd))[0-9]+)$"))
                if(!match) return;
                if (match[4] == 'fd') {
                    const objPath = "/org/bluez/hci0/dev_" + match[2]
                    const mac_address = match[2].replace(/_/g, ':');
                    this.emit("device connected", mac_address, objPath)
                }
                else if (match[4] == 'player') {
                    if(ignore_status_signal == false) {
                        ignore_status_signal = true
                        this.service.getInterface(match[0], 'org.freedesktop.DBus.Properties', (err, notification) => {
                            notification.on('PropertiesChanged', async(signal, status) => {
                                if(status[1] != undefined) {
                                    if(status[1][0] == 'Status') {
                                        this.emit('update state', status[1][1][1][0])
                                    }
                                }
                                else if(status[0][0] == 'Status') {
                                    var state = status[0][1][1][0]
                                    this.emit('update state', state)
                                }
                            })
                        })
                    }
                }
            })

            objectManager.on('InterfacesRemoved', async(path) => {
                const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/((fd)[0-9]+)$"))
                if(match != null) {
                    this.emit("device disconnected")
                }
            })
        })
    }

    async getAdapter(dev) {
        let path = '/org/bluez/' + dev;
        const interface_ = await this.DbusgetInterface('org.bluez', path, 'org.bluez.Adapter1')

        if(!interface_) throw new Error("Adapter not found");
        this.adapter[dev] = new Adapter(interface_);
        return this.adapter[dev];
    }

    async getDevice(address) {
        const interface_ = await this.DbusgetInterface('org.bluez', address, 'org.bluez.Device1')
        if(!interface_) throw new Error("Device not found")

        return new Device(interface_)
    }
    
    setMediaControl(path, command) {
        return new Promise((resolve) => {
            this.DbusgetInterface('org.bluez', path, 'org.bluez.MediaControl1',(err, mediaControl) => {
                if(err) {
                    console.error(err)
                }
                switch(command) {
                    case 'play':
                        mediaControl.Play((err) => {
                            if(err) return resolve(err)
                            resolve('resume playback')
                        })
                        break;
                    case 'pause':
                        mediaControl.Pause((err) => {
                            if(err) return resolve(err)
                            resolve('pause playback')
                        })
                        break;
                    case 'stop':
                        mediaControl.Stop((err) => {
                            if(err) return resolve(err)
                            resolve('stop playback')
                        })
                        break;
                    case 'next':
                        mediaControl.Next((err) => {
                            if(err) return resolve(err)
                            resolve('next playback')
                        })
                        break;
                    case 'previous':
                        mediaControl.Previous((err) => {
                            if(err) return resolve(err)
                            resolve('previous playback')
                        })
                        break;
                    case 'rewind':
                        mediaControl.Rewind((err) => {
                            if(err) return resolve(err)
                            resolve('rewind playback')
                        })
                        break;
                    case 'fastforward':
                        mediaControl.FastForward((err) => {
                            if(err) return resolve(err)
                            resolve('fastforward playback')
                        })
                        break;
                }
            })
        })
    }

    listAllDevice() {
        return new Promise(resolve => {
            var bluez_device_list = {}
            this.objectManager.GetManagedObjects((err, objects) => {
                if(err) {
                    console.error(err);
                }

                for(var object in objects) {
                    if(object >= 2) {
                        //check MAC invalid
                        const regex = /([0-9A-Z]{2}:){5}[0-9A-Z]{2}/g
                        const match = regex.exec(objects[object][1][1][1][0][1][1][0])

                        /* if MAC == name */
                        if (match[0].replace(/:/g, '-') == objects[object][1][1][1][2][1][1][0]) continue;
                        bluez_device_list[`${objects[object][1][1][1][0][1][1][0]}`] = []
                        /* Get MAC address of bluetooth device to init key of array*/
                        bluez_device_list[`${objects[object][1][1][1][0][1][1][0]}`][0] =
                            objects[object][0]
                        // The first element, get object path 
                        bluez_device_list[`${objects[object][1][1][1][0][1][1][0]}`][1] =
                            objects[object][1][1][1][2][1][1][0]
                        /* The second element, get Name of bluetooth device */
                    }
                }

                for(var object in objects) {
                    if(object >= 2) {
                        const regex = /\/org\/bluez\/hci0\/dev_(.*)\/(((player)|(fd))[0-9]+)$/g;
                        const match = regex.exec(objects[object][0])

                        if(match == null) continue;
                        var mac = match[1].replace(/_/g, ':');
                        if(match[3] == 'fd') {
                            bluez_device_list[mac][2] = match[0]
                        }
                        else if(match[3] == 'player') {
                            bluez_device_list[mac][3] = match[0]
                        }
                    }
                }
                resolve(bluez_device_list)
            })
        })
    }

    registerAgent(agent, capabilities) {
        // assert(agent instance of Agent)
        const self = this;
        return new Promise((resolve, reject) => {
            self.agentManager.RegisterAgent(agent._DBusObject.path, capabilities, (err) => {
                if(err) return reject(err);
                resolve('Agent ' + capabilities);
            });
        });
    }

    registerDefaultAgent(agent) {
        const self = this
        return new Promise((resolve, reject) => {
            self.agentManager.RequestDefaultAgent(agent._DBusObject.path, (err) => {
                if(err) return reject(err);
                resolve('Default Agent')
            })
        })
    }

}

module.exports = Bluez;
