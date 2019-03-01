const dbus = require('dbus-native')
var bus = dbus.systemBus()
var services = bus.getService('org.olli.wakeword')

services.getInterface('/org/olli/wakeword', 'org.olli.wakeword.event', function(err, iface) {
    if(err) console.error(err)

        iface.on('wakeupSignal', function() {
            console.log('wakeword here')
        })
})
