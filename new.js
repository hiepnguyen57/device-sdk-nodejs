const Player2 = require('./method').Player
const Event = require('./test').Event

function update() {
	console.log('update: ' + Player2.getState())
}
console.log(Player2.getState());
Player2.setState(Event.PlaybackPaused)

console.log(Player2.getState());

setInterval(update, 2000);

