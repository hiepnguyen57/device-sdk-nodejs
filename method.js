const Event = require('./test').Event
const Player = require('./test').Playback()

console.log(Player.getState());

Player.setState(Event.PlaybackResumed)

console.log(Player.getState())


//console.log(test.getState())

function intervalFunc() {
	Player.setState(Event.PlaybackStopped)
	console.log('Cant stop me now!');
}

setTimeout(intervalFunc, 4000);

module.exports.Player = Player
