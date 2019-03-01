const buffers =  require('./buffers.js').buffers
const ioctl = require('./ioctl.js')
const amixer = require('./amixer.js')
var volumebackup

async function ButtonEvent(command) {
    var current_vol

    switch(command) {
        case buffers.VOLUME_UP:
            current_vol = await amixer.volume_control('volumeup')
            await ioctl.Transmit(buffers.BUTTON, buffers.VOLUME_UP, current_vol)
            console.log('volume up')
            console.log('current volume: ' + current_vol);
            break;
        case buffers.VOLUME_DOWN:
            current_vol = await amixer.volume_control('volumedown')
            if(current_vol < 30) {
                await ioctl.Transmit(buffers.BUTTON, buffers.VOLUME_MUTE, current_vol)
            }
            else{
                await ioctl.Transmit(buffers.BUTTON, buffers.VOLUME_DOWN, current_vol)
            }
            console.log('volume down')
            console.log('current volume: ' + current_vol);
            break;
        case buffers.VOLUME_MUTE:
            await ioctl.mute()
            await ioctl.Transmit(buffers.BUTTON, buffers.VOLUME_MUTE)
            console.log('volume mute')
            break;
        case buffers.VOLUME_UNMUTE:
            current_vol = await amixer.volume_control('getvolume')
            await ioctl.unmute()
            await ioctl.Transmit(buffers.BUTTON, buffers.VOLUME_UNMUTE, current_vol)
            console.log('volume unmute')
            break;
    }
}


async function Ledring_Effect(command, state) {
    switch(command) {
        case buffers.LED_DIMMING:
            await ioctl.Transmit(buffers.LED_RING, buffers.LED_DIMMING, state)
            console.log('LED DIMMING ' + state);
            break;
        case buffers.LED_CIRCLE:
            await ioctl.Transmit(buffers.LED_RING, buffers.LED_CIRCLE, state)
            console.log('LED CIRCLE ' + state);
            break;
        case buffers.LED_EMPTY:
            await ioctl.Transmit(buffers.LED_RING, buffers.LED_EMPTY, state)
            console.log('LED EMPTY ' + state);
            break;
        case buffers.LED_ALLCOLORS:
            await ioctl.Transmit(buffers.LED_RING, buffers.LED_ALLCOLORS, state)
            console.log('LED ALLCOLORS ' + state);
            break;
        case buffers.LED_PATTERN:
            await ioctl.Transmit(buffers.LED_RING, buffers.LED_PATTERN, state)
            console.log('LED PATTERN ' + state);
            break;
        case buffers.COLOR_WHEEL:
            await ioctl.Transmit(buffers.LED_RING, buffers.COLOR_WHEEL, state)
            console.log('LED COLOR WHEEL ' + state);
            break;
        case buffers.CLEAN_ALL:
            await ioctl.Transmit(buffers.LED_RING, buffers.CLEAN_ALL);
            console.log('Led Ring clear effect');
            break;
    }
}

async function UserEvent(command) {
    switch(command) {
        case buffers.WIFI_CONNECTED:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.WIFI_CONNECTED)
            console.log('wifi was connected')
            break;
        case buffers.WIFI_DISCONNECTED:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.WIFI_DISCONNECTED)
            console.log('wifi was disconnected')
            break;
        case buffers.WAKEWORD_STOP:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.WAKEWORD_STOP)
            console.log('wakeword end')
            break;
        case buffers.MICROPHONE_MUTE:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.MICROPHONE_MUTE)
            console.log('microphone mute')
            break;
        case buffers.MICROPHONE_UNMUTE:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.MICROPHONE_UNMUTE)
            console.log('microphone unmute')
            break;
        case buffers.VOLUME_MUTE:
            await ioctl.mute()
            ioctl.Transmit(buffers.USER_EVENT, buffers.VOLUME_MUTE)
            console.log('muted');
            break;
        case buffers.ALL_LED_ON:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.ALL_LED_ON);
            console.log('All led is ON');
            break;
        case buffers.BLE_ON:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.BLE_ON);
            console.log('turn on bluetooth');
            break;
        case buffers.BLE_OFF:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.BLE_OFF)
            console.log('turn off bluetooth');
            break;
        case buffers.USB_AUDIO:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.USB_AUDIO)
            console.log('enable usb mic array');
            break;
        case buffers.CLIENT_ERROR:
            await ioctl.Transmit(buffers.USER_EVENT, buffers.CLIENT_ERROR)
            console.log('client error');
            break;
    }
}

async function SwitchContextBuffer(target, command) {
    switch(target) {
        case buffers.BUTTON:
            await ButtonEvent(command)
            break;
        case buffers.USER_EVENT:
            await UserEvent(command)
            break;
    }
}

async function fadeInVolume() {
    volumebackup = await amixer.volume_control('getvolume')
    await amixer.volume_control('setvolume 20')
}

function fadeOutVolume() {
    amixer.volume_control(`setvolume ${volumebackup}`)
}
module.exports = {
    ButtonEvent:              ButtonEvent,
    Ledring_Effect:           Ledring_Effect,
    UserEvent:                UserEvent,
    SwitchContextBuffer:      SwitchContextBuffer,
    fadeInVolume:             fadeInVolume,
    fadeOutVolume:            fadeOutVolume,
}