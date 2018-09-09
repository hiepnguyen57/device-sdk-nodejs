const EventEmitter = require('events').EventEmitter;
const DBus = require('dbus');
const util = require('util');

const Adapter = require('./Adapter');
const Device = require('./Device');
const Agent = require('./Agent');
const Profile = require('./Profile');
//const SerialProfile = require('./SerialProfile');
function match_regex(regex, text) {
    return regex.exec(text)
}


class Bluez extends EventEmitter {
    constructor(options) {
        super();
        this.options = Object.assign({
            service: null, // connection local service
            objectPath: '/tmp/agent' // implement for generating agent
        }, options);
        this.bus = DBus.getBus('system');
        if(this.options.service && typeof this.options.service !== "string")
            this.userService = this.options.service;

        this.getInterface = util.promisify(this.bus.getInterface.bind(this.bus));
        this.adapter = {};
        this.devices = {};
    }

    async init() {
        this.objectManager = await this.getInterface('org.bluez', '/', 'org.freedesktop.DBus.ObjectManager');
        this.agentManager = await this.getInterface('org.bluez', '/org/bluez', 'org.bluez.AgentManager1');
        this.profileManager = await this.getInterface('org.bluez', '/org/bluez', 'org.bluez.ProfileManager1');

        this.objectManager.on('InterfacesAdded', this.onInterfacesAdded.bind(this));
        this.objectManager.on('InterfacesRemoved', this.onInterfaceRemoved.bind(this));
        this.objectManager.GetManagedObjects((err, objs) => {
            Object.keys(objs).forEach((k)=>this.onInterfacesAdded(k, objs[k]))
        });
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
        const match = address.match(new RegExp("^/org/bluez/(\\w+)/dev_(\\w+)$"));
        if(match) address = match[2];
        address = address.replace(/:/g,"_");
        if(this.devices[address] && typeof this.devices[address] !== 'string') {
            // Device already created
            return this.devices[address];
        }
        if(!this.devices[address]) throw new Error("Device not found");
        const interface_ = await this.getInterface('org.bluez', this.devices[address], 'org.bluez.Device1');
        return new Device(interface_);
    }

    /*
    This registers a profile implementation.

    If an application disconnects from the bus all
    its registered profiles will be removed.

    HFP HS UUID: 0000111e-0000-1000-8000-00805f9b34fb

        Default RFCOMM channel is 6. And this requires
        authentication.

    Available options:

        string Name

            Human readable name for the profile

        string Service

            The primary service class UUID
            (if different from the actual
                profile UUID)

        string Role

            For asymmetric profiles that do not
            have UUIDs available to uniquely
            identify each side this
            parameter allows specifying the
            precise local role.

            Possible values: "client", "server"

        uint16 Channel

            RFCOMM channel number that is used
            for client and server UUIDs.

            If applicable it will be used in the
            SDP record as well.

        uint16 PSM

            PSM number that is used for client
            and server UUIDs.

            If applicable it will be used in the
            SDP record as well.

        boolean RequireAuthentication

            Pairing is required before connections
            will be established. No devices will
            be connected if not paired.

        boolean RequireAuthorization

            Request authorization before any
            connection will be established.

        boolean AutoConnect

            In case of a client UUID this will
            force connection of the RFCOMM or
            L2CAP channels when a remote device
            is connected.

        string ServiceRecord

            Provide a manual SDP record.

        uint16 Version

            Profile version (for SDP record)

        uint16 Features

            Profile features (for SDP record)

    Possible errors: org.bluez.Error.InvalidArguments
                        org.bluez.Error.AlreadyExists
    */
    // registerProfile(profile, options) {
    //     // assert(profile instance of Profile)
    //     const self = this;
    //     return new Promise((resolve, reject) => {
    //         self.profileManager.RegisterProfile(profile._DBusObject.path, profile.uuid, options, (err) => {
    //             if(err) return reject(err);
    //             resolve();
    //         });
    //     });
    // }

    // registerSerialProfile(listener, mode, options) {
    //     if(!mode) mode = 'client';
    //     const obj = this.getUserServiceObject();
    //     const profile = new SerialProfile(this, obj, listener);
    //     options = Object.assign({
    //         Name: "Node Serial Port",
    //         Role: mode,
    //         PSM: 0x0003
    //     }, options);
    //     return this.registerProfile(profile, options);
    // }

    /*
    This registers an agent handler.

    The object path defines the path of the agent
    that will be called when user input is needed.

    Every application can register its own agent and
    for all actions triggered by that application its
    agent is used.

    It is not required by an application to register
    an agent. If an application does chooses to not
    register an agent, the default agent is used. This
    is on most cases a good idea. Only application
    like a pairing wizard should register their own
    agent.

    An application can only register one agent. Multiple
    agents per application is not supported.

    The capability parameter can have the values
    "DisplayOnly", "DisplayYesNo", "KeyboardOnly",
    "NoInputNoOutput" and "KeyboardDisplay" which
    reflects the input and output capabilities of the
    agent.

    If an empty string is used it will fallback to
    "KeyboardDisplay".

    Possible errors: org.bluez.Error.InvalidArguments
                org.bluez.Error.AlreadyExists
    */
    registerAgent(path, capabilities) {
        // assert(agent instance of Agent)
        const self = this;
        return new Promise((resolve, reject) => {
            self.agentManager.RegisterAgent(path, capabilities, (err) => {
                if(err) return reject(err);
                self.agentManager.RequestDefaultAgent(path, (err) => {
                    if(err) return reject(err)
                })
                resolve();
            });
        });
    }

    registerDefaultAgent() {
        const obj = this.getUserServiceObject();
        const agent = new Agent(this, obj);
        return this.registerAgent(agent, "KeyboardDisplay");
    }

    getUserService() {
        if(!this.userService) {
            this.userService = DBus.registerService('system', this.options.service);
        }
        return this.userService;
    }
    
    getUserServiceObject() {
        if(!this.userServiceObject) {
            this.userServiceObject = this.getUserService().createObject(this.options.objectPath);
        }
        return this.userServiceObject;
    }

    async onInterfacesAdded(path, interfaces) {
        const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/(((player)|(fd))[0-9]+)$"))
        if(!match) return;

        if (match[4] == 'fd') {
            const mac_address = match[2].replace(/_/g, ':');
            console.log('new device connected: ' + mac_address);
            this.objectPath = mac_address

        }
        else if (match[4] == 'player') {
            console.log('trigger signal for controlling');
        }

    }

    async onInterfaceRemoved(path, props/*:string[]*/) {
        const match = path.match(new RegExp("^/org/bluez/(\\w+)(?:/dev_(\\w+))?\/(((player)|(fd))[0-9]+)$"))
        if(!match) return;
        console.log('device disconnected');
    }

    async mediaController(path, command) {
        this.mediaControl = await this.getInterface('org.bluez', path, 'org.bluez.MediaControl1');

        const self = this;

        switch(command) {
            case 'play':
                self.mediaControl.Play()
                console.log('playback resume');
                break;
            case 'pause':
                self.mediaControl.Pause()
                console.log('playback paused');
                break;
            case 'stop':
                self.mediaControl.Stop()
                console.log('playback stopped');
                break;
            case 'next':
                self.mediaControl.Next()
                break;
            case 'previous':
                self.mediaControl.Previous()
                break;
            case 'rewind':
                self.mediaControl.Rewind()
                break;
        }
    }

    async getMediaPlayerStatus(path) {
        this.mediaPlayer = await this.getInterface('org.buez', path, 'org.bluez.MediaPlayer1')
    } 
}

module.exports = Bluez;
