const amixer = require('./amixer')

const playerState = {
	webActive: 			0,
	bluetoothActive: 	1,
}

function ResumeHandler(object) {
	console.log('resume handler');
	console.log(object.activeState);
	if(object.activeState == playerState.webActive) {
		console.log('Web resume');
		object.webPlayer.Play()
	}
	else {
		console.log('bluetooth resume');
		object.bluePlayer.Play()
	}
}

function PauseHandler(object) {
	console.log('Pause Handler');
	console.log(object.activeState);
	if(object.activeState == playerState.webActive) {
		console.log('Web Pause');
		object.webPlayer.Pause()
	}
	else {
		console.log('bluetooth Pause');
		object.bluePlayer.Pause()
	}
}

function StopHandler(object) {
	console.log('Stop Handler');
	console.log(object.activeState);
	if(object.activeState == playerState.webActive) {
		console.log('Web Stop');
		object.webPlayer.Stop()
	}
	else {
		console.log('bluetooth Stop');
	}
}

function NextHandler(object) {
	console.log('Next Handler');
	console.log(object.activeState);
	if(object.activeState == playerState.webActive) {
		console.log('Web Next');
	}
	else {
		console.log('bluetooth Next');
	}
}

function PrevHandler(object) {
	console.log('Prev Handler');
	console.log(object.activeState);
	if(object.activeState == playerState.webActive) {
		console.log('Web prev');
	}
	else {
		console.log('bluetooth prev');
	}
}

function W_NewSongHandler(object) {
	console.log('Web play new song');
	console.log('objstate: ' + object.activeState);
	object.webPlayer.streamURL = object.url
	object.webPlayer.Start()
}

function B_PlayHandler(object) {
	console.log('Bluetooth play');
	console.log(object.activeState);
}

function B_FinishedHandler(object) {
	console.log('B_FinishedHandler')
	console.log(object.activeState)
}

module.exports.playerState = playerState
module.exports.ResumeHandler = ResumeHandler
module.exports.PauseHandler = PauseHandler
module.exports.StopHandler = StopHandler
module.exports.NextHandler = NextHandler
module.exports.PrevHandler = PrevHandler
module.exports.W_NewSongHandler = W_NewSongHandler
module.exports.B_PlayHandler = B_PlayHandler
module.exports.B_FinishedHandler = B_FinishedHandler