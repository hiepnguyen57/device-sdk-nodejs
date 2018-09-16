
const Event = {
	W_PlaybackStarted: 		0,
	PlaybackStopped: 		1,
	W_PlaybackFailed: 		2,
	PlaybackResume: 		3,
	PlaybackPaused: 		4,
	W_PlaybackFinished: 	5,
}

const WebPlayerState = {
	idle: 		 0,
	playing: 	 1,
	stoped: 	 2,
	paused: 	 3,
	finished: 	 4,
}

var state = WebPlayerState.finished
if(state in [WebPlayerState.idle, 
			WebPlayerState.paused,
			WebPlayerState.playing,
			WebPlayerState.stopped,
			WebPlayerState.finished]) {
	console.log('okay here');
}
else
	console.log('k check dc');