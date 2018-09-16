const PlayerState = {
	webActive: 			0,
	bluetoothActive: 	1,
}

function ResumeHandler(object) {
	console.log('resume handler');
	console.log(object.activeState);
	if(object.activeState == PlayerState.webActive) {
		console.log('Web resume');
	}
	else {
		console.log('bluetooth resume');
	}
}

function PauseHandler(object) {
	console.log('Pause Handler');
	console.log(object.activeState);
	if(object.activeState == PlayerState.webActive) {
		console.log('Web Pause');
	}
	else {
		console.log('bluetooth Pause');
	}
}

function StopHandler(object) {
	console.log('Stop Handler');
	console.log(object.activeState);
	if(object.activeState == PlayerState.webActive) {
		console.log('Web Stop');
	}
	else {
		console.log('bluetooth Stop');
	}
}

function NextHandler(object) {
	console.log('Next Handler');
	console.log(object.activeState);
	if(object.activeState == PlayerState.webActive) {
		console.log('Web Next');
	}
	else {
		console.log('bluetooth Next');
	}
}
function PrevHanler(object) {
	console.log('Prev Handler');
	console.log(object.activeState);
	if(object.activeState == PlayerState.webActive) {
		console.log('Web prev');
	}
	else {
		console.log('bluetooth prev');
	}
}
function W_NewSongHandler(object) {
	console.log('Web play new song');
	console.log(object.activeState);
}
function B_PlayHandler(object) {
	console.log('Bluetooth play');
	console.log(object.activeState);
}
function B_FinishedHandler(object) {
	console.log('B_FinishedHandler')
	console.log(object.activeState)
}
function volume_up() {

}
function volume_down() {

}
function fadeInVolume() {

}
function fadeOutVolume() {
	
}