const EventEmitter = require('events').EventEmitter;
const DBus = require('dbus');
const util = require('util');

const Adapter = require('./Adapter');
const Device = require('./Device');
const Agent = require('./Agent');
const Profile = require('./Profile');
var ignore_signal1 = false
var ignore_signal2 = false

class Bluez extends EventEmitter {
    constructor(options) {
        super();
        this.options = Object.assign({
            service: null, // connection local service
            objectPath: '/tmp/agent' // implement for generating agent
        }, options);
        this.bus = DBus.getBus('system');

        this.getInterface = util.promisify(this.bus.getInterface.bind(this.bus));
        this.adapter = {};
        this.devices = {};
    }

    async init() {
        this.objectManager = await this.getInterface('org.bluez', '/', 'org.freedesktop.DBus.ObjectManager');
        this.agentManager = await this.getInterface('org.bluez', '/org/bluez', 'org.bluez.AgentManager1');
        this.profileManager = await this.getInterface('org.bluez', '/org/bluez', 'org.bluez.ProfileManager1');

        if(ignore_signal1 == false) {
            ignore_signal1 = true
            this.objectManager.on('InterfacesAdded', async(path) => {
                const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/(((player)|(fd))[0-9]+)$"))
                if(!match) return;
                if (match[4] == 'fd') {
                    const objPath = "/org/bluez/hci0/dev_" + match[2]
                    const mac_address = match[2].replace(/_/g, ':');
                    this.emit("device connected", mac_address, objPath)
                }
                else if (match[4] == 'player') {
                    if(ignore_signal2 == false) {
                        ignore_signal2 = true
                        this.emit("update status", match[0])
                    }

                }
            })

            this.objectManager.on('InterfacesRemoved', async(path) => {
                const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/((fd)[0-9]+)$"))
                if(match != null) {
                    this.emit("device disconnected")
                }
            })
        }

    }

    async getAdapter(dev) {
        const match = dev.match(new RegExp("^/org/bluez/(\\w+)$"));
        if(match) dev = match[1];
        // If the adapter was not discovered jet, try the default path.
        let path = '/org/bluez/' + dev;
        if(this.adapter[dev]) {
            if(typeof this.adapter[dev] === "string") {
                path = this.adapter[dev];
            } else {
                // Adapter already created
                return this.adapter[dev];
            }
        }
        const interface_ = await this.getInterface('org.bluez', path, 'org.bluez.Adapter1').catch((err) => {
            return null
        })

        if(!interface_) throw new Error("Adapter not found");
        this.adapter[dev] = new Adapter(interface_);
        return this.adapter[dev];
    }

    async getDevice(address) {
        const interface_ = await this.getInterface('org.bluez', address, 'org.bluez.Device1').catch((err) => {
            return null
        })
        if(!interface_) throw new Error("Device not found")
        this.device[address] = new Device(interface_)

        return this.device[address]
    }

    async mediaControl1(path, command) {
        this.mediaControl = await this.getInterface('org.bluez', path, 'org.bluez.MediaControl1').catch((err) => {
            return null
        });

        const self = this;
        return new Promise((resolve, reject) => {
            switch(command) {
                case 'play':
                    self.mediaControl.Play((err) => {
                        if(err) return reject(err)
                        resolve('resume playback')
                    })
                    break;
                case 'pause':
                    self.mediaControl.Pause((err) => {
                        if(err) return reject(err)
                        resolve('pause playback')
                    })
                    break;
                case 'stop':
                    self.mediaControl.Stop((err) => {
                        if(err) return reject(err)
                        resolve('stop playback')
                    })
                    break;
                case 'next':
                    self.mediaControl.Next((err) => {
                        if(err) return reject(err)
                        resolve('next playback')
                    })
                    break;
                case 'previous':
                    self.mediaControl.Previous((err) => {
                        if(err) return reject(err)
                        resolve('previous playback')
                    })
                    break;
                case 'rewind':
                    self.mediaControl.Rewind((err) => {
                        if(err) return reject(err)
                        resolve('rewind playback')
                    })
                    break;
            }
        })

    }
}

module.exports = Bluez;
