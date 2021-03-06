class Adapter {

    constructor(interface_) {
        this._interface = interface_;
    }

    /*
    void StartDiscovery()

        This method starts the device discovery session. This
        includes an inquiry procedure and remote device name
        resolving. Use StopDiscovery to release the sessions
        acquired.

        This process will start creating Device objects as
        new devices are discovered.

        During discovery RSSI delta-threshold is imposed.

        Possible errors: org.bluez.Error.NotReady
                    org.bluez.Error.Failed
    */
    StartDiscovery() {
        return new Promise((resolve, reject)=>{
            this._interface.StartDiscovery((err)=>{
                if(err) return reject(err);
                resolve('Start Discovery');
            })
        });
    }

    /*
    void StopDiscovery()

        This method will cancel any previous StartDiscovery
        transaction.

        Note that a discovery procedure is shared between all
        discovery sessions thus calling StopDiscovery will only
        release a single session.

        Possible errors: org.bluez.Error.NotReady
                    org.bluez.Error.Failed
                    org.bluez.Error.NotAuthorized
    */
    StopDiscovery() {
        return new Promise((resolve, reject)=>{
            this._interface.StopDiscovery((err)=>{
                if(err) return reject(err);
                resolve('Stop Discovery');
            })
        });
    }

    /*
    void RemoveDevice(object device)

        This removes the remote device object at the given
        path. It will remove also the pairing information.

        Possible errors: org.bluez.Error.InvalidArguments
                    org.bluez.Error.Failed
    */
    RemoveDevice(device) {
        if(typeof device !== "string") device = device._interface.objectPath;
        return new Promise((resolve, reject)=>{
            this._interface.RemoveDevice(device, (err)=>{
                if(err) return reject(err);
                resolve('Remove Device');
            })
        });
    }
    
    /*
    void SetDiscoveryFilter(dict filter)

        This method sets the device discovery filter for the
        caller. When this method is called with no filter
        parameter, filter is removed.

        Parameters that may be set in the filter dictionary
        include the following:

        array{string} UUIDs

            Filter by service UUIDs, empty means match
            _any_ UUID.

            When a remote device is found that advertises
            any UUID from UUIDs, it will be reported if:
            - Pathloss and RSSI are both empty.
            - only Pathloss param is set, device advertise
                TX pwer, and computed pathloss is less than
                Pathloss param.
            - only RSSI param is set, and received RSSI is
                higher than RSSI param.

        int16 RSSI

            RSSI threshold value.

            PropertiesChanged signals will be emitted
            for already existing Device objects, with
            updated RSSI value. If one or more discovery
            filters have been set, the RSSI delta-threshold,
            that is imposed by StartDiscovery by default,
            will not be applied.

        uint16 Pathloss

            Pathloss threshold value.

            PropertiesChanged signals will be emitted
            for already existing Device objects, with
            updated Pathloss value.

        string Transport (Default "auto")

            Transport parameter determines the type of
            scan.

            Possible values:
                "auto"	- interleaved scan
                "bredr"	- BR/EDR inquiry
                "le"	- LE scan only

            If "le" or "bredr" Transport is requested,
            and the controller doesn't support it,
            org.bluez.Error.Failed error will be returned.
            If "auto" transport is requested, scan will use
            LE, BREDR, or both, depending on what's
            currently enabled on the controller.

        bool DuplicateData (Default: true)

            Disables duplicate detection of advertisement
            data.

            When enabled PropertiesChanged signals will be
            generated for either ManufacturerData and
            ServiceData everytime they are discovered.

        When discovery filter is set, Device objects will be
        created as new devices with matching criteria are
        discovered regardless of they are connectable or
        discoverable which enables listening to
        non-connectable and non-discoverable devices.

        When multiple clients call SetDiscoveryFilter, their
        filters are internally merged, and notifications about
        new devices are sent to all clients. Therefore, each
        client must check that device updates actually match
        its filter.

        When SetDiscoveryFilter is called multiple times by the
        same client, last filter passed will be active for
        given client.

        SetDiscoveryFilter can be called before StartDiscovery.
        It is useful when client will create first discovery
        session, to ensure that proper scan will be started
        right after call to StartDiscovery.

        Possible errors: org.bluez.Error.NotReady
                    org.bluez.Error.NotSupported
                    org.bluez.Error.Failed
    */
    SetDiscoveryFilter(filter) {
        return new Promise((resolve, reject)=>{
            this._interface.CancelPairing(filter, (err)=>{
                if(err) return reject(err);
                resolve();
            })
        });
    }
    
    /*
    array{string} GetDiscoveryFilters()

        Return available filters that can be given to
        SetDiscoveryFilter.

        Possible errors: None
    */
    GetDiscoveryFilters() {
        return new Promise((resolve, reject)=>{
            this._interface.CancelPairing((err, filters)=>{
                if(err) return reject(err);
                resolve(filters);
            })
        });
    }
    


    /****** Properties ******/

    getProperties() {
        return new Promise((resolve, reject)=>{
            this._interface.getProperties((err, props)=>{
                if(err) return reject(err);
                resolve(props);
            })
        });
    }

    getProperty(name) {
        return new Promise((resolve, reject)=>{
            this._interface.getProperty(name, (err, val)=>{
                if(err) return reject(err);
                resolve(val);
            })
        });
    }

    setProperty(name, value) {
        return new Promise((resolve, reject)=>{
            this._interface.setProperty(name, value, (err)=>{
                if(err) return reject(err);
                resolve((name + value));
            })
        });
    }


    /*
    string Address [readonly]

        The Bluetooth device address.
    */
    Address() {
        return this.getProperty("Address");
    }

    /*
    string Name [readonly]

        The Bluetooth system name (pretty hostname).

        This property is either a static system default
        or controlled by an external daemon providing
        access to the pretty hostname configuration.
    */
    Name() {
        return this.getProperty("Name");
    }

    /*
    string Alias [readwrite]

        The Bluetooth friendly name. This value can be
        changed.

        In case no alias is set, it will return the system
        provided name. Setting an empty string as alias will
        convert it back to the system provided name.

        When resetting the alias with an empty string, the
        property will default back to system name.

        On a well configured system, this property never
        needs to be changed since it defaults to the system
        name and provides the pretty hostname. Only if the
        local name needs to be different from the pretty
        hostname, this property should be used as last
        resort.
    */
    Alias(value) {
        if(value !== undefined) {
            return this.setProperty("Alias", value);
        }
        return this.getProperty("Alias");
    }

    /*
    uint32 Class [readonly]

        The Bluetooth class of device.

        This property represents the value that is either
        automatically configured by DMI/ACPI information
        or provided as static configuration.
    */
    Class() {
        return this.getProperty("Class");
    }

    /*
    boolean Powered [readwrite]

        Switch an adapter on or off. This will also set the
        appropriate connectable state of the controller.

        The value of this property is not persistent. After
        restart or unplugging of the adapter it will reset
        back to false.
    */
    Powered(mode) {
        if(mode !== undefined) {
            return this.setProperty("Powered", mode);
        }
        return this.getProperty("Powered");
    }

    /*
    boolean Discoverable [readwrite]

        Switch an adapter to discoverable or non-discoverable
        to either make it visible or hide it. This is a global
        setting and should only be used by the settings
        application.

        If the DiscoverableTimeout is set to a non-zero
        value then the system will set this value back to
        false after the timer expired.

        In case the adapter is switched off, setting this
        value will fail.

        When changing the Powered property the new state of
        this property will be updated via a PropertiesChanged
        signal.

        For any new adapter this settings defaults to false.
    */
    Discoverable(mode) {
        if(mode !== undefined) {
            return this.setProperty("Discoverable", mode);
        }
        return this.getProperty("Discoverable");
    }
    
    /*
    boolean Pairable [readwrite]

        Switch an adapter to pairable or non-pairable. This is
        a global setting and should only be used by the
        settings application.

        Note that this property only affects incoming pairing
        requests.

        For any new adapter this settings defaults to true.
    */
    Pairable(mode) {
        if(mode !== undefined) {
            return this.setProperty("Pairable", mode);
        }
        return this.getProperty("Pairable");
    }

    /*
    uint32 PairableTimeout [readwrite]

        The pairable timeout in seconds. A value of zero
        means that the timeout is disabled and it will stay in
        pairable mode forever.

        The default value for pairable timeout should be
        disabled (value 0).
    */
    PairableTimeout(value) {
        if(value !== undefined) {
            return this.setProperty("PairableTimeout", value);
        }
        return this.getProperty("PairableTimeout");
    }

    /*
    uint32 DiscoverableTimeout [readwrite]

        The discoverable timeout in seconds. A value of zero
        means that the timeout is disabled and it will stay in
        discoverable/limited mode forever.

        The default value for the discoverable timeout should
        be 180 seconds (3 minutes).
    */
    DiscoverableTimeout(value) {
        if(value !== undefined) {
            return this.setProperty("DiscoverableTimeout", value);
        }
        return this.getProperty("DiscoverableTimeout");
    }

    /*
    boolean Discovering [readonly]

        Indicates that a device discovery procedure is active.
    */
    Discovering() {
        return this.getProperty("Discovering");
    }

    /*
    array{string} UUIDs [readonly]

        List of 128-bit UUIDs that represents the available
        local services.
    */
    UUIDs() {
        return this.getProperty("UUIDs");
    }

    /*
    string Modalias [readonly, optional]

        Local Device ID information in modalias format
        used by the kernel and udev.
    */
    Modalias() {
        return this.getProperty("Modalias");
    }
}

module.exports = Adapter;
