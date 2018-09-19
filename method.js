
const Event = {
	//B_PlaybackReady: 0,
	StatusChanged: 		1,
	PlaybackPaused: 	2,
	PlaybackResumed: 	3,
	PlaybackStopped: 	4
}
const bluePlayerState = {
	idle: 			1,
	playing: 		2,
	paused: 		3,
	error: 			4,
}
const stateGroup = {
	'idle': 	bluePlayerState.idle,
	'playing':	bluePlayerState.playing,
	'paused': 	bluePlayerState.paused,
	'stopped': 	bluePlayerState.paused,
}

class Player {
	constructor() {
		this.currState = bluePlayerState.idle
	}
	setSate(state) {
		this.currState = stateGroup[state]
	}

	getState() {
		return this.currState
	}
}

const play = new Player()

console.log(play.getState());

play.setSate('playing')

console.log(play.getState());
