const Event = {
    //B_PlaybackReady: 0,
    StatusChanged:      1,
    PlaybackPaused:     2,
    PlaybackResumed:    3,
    PlaybackStopped:    4
}
const bluePlayerState = {
    idle:           1,
    playing:        2,
    paused:         3,
    error:          4,
}
const stateGroup = {
    'idle':     bluePlayerState.idle,
    'playing':  bluePlayerState.playing,
    'paused':   bluePlayerState.paused,
    'stopped':  bluePlayerState.paused,
}
var play_object
//console.log(stateGroup['playing'])

class Player {
    constructor() {
        this.currState = Event.StatusChanged
    }

    setState(state) {
        this.currState = state
    }

    getState() {
        console.log('state now: ' + this.currState);
        return this.currState
    }
}

function Playback() {
    play_object = new Player()
    return play_object
}
module.exports.Event = Event
module.exports.Playback = Playback