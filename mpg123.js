const {spawn} = require("child_process")
// const STATUS_PLAY = 1
// const STATUS_PAUSE = 2
// const STATUS_STOP = 3
const mpg123Status = {
	idle: 			1,
	play: 			2,
	pause: 			3,
	stop: 			4,
}

class Mpg123 {
	constructor() {
		this.status = mpg123Status.idle
		this.mpg123_app = spawn('mpg123', ['-R']);
		this.mpg123_app.stdin.setEncoding('utf8');

		this.mpg123_app.stdout.on('data', function(data) {
			const text = data.toString('utf8')
			if(text.search("@P 0") >= 0) {
				console.log('song ended');
				this.status = mpg123Status.idle
			}
		})
	}

	set_source(source) {
		this.status = mpg123Status.play
		console.log('song url as: ' + source);
		this.mpg123_app.stdin.write(`L ${source}\n`);
		console.log('source loaded');
	}

	pause() {
		if(this.status == mpg123Status.play) {
			this.mpg123_app.stdin.write(`P\n`);
			this.status = mpg123Status.pause
		}
		else
			console.log('Mpg123 is already paused');
	}

	play() {
		if(this.status == mpg123Status.pause) {
			this.mpg123_app.stdin.write(`P\n`)
			this.status = mpg123Status.play
		}
		else
			console.log('Mpg123 is already played');
	}

	stop() {
		this.mpg123_app.stdin.write(`S\n`);
	}

	set_volume(vol) {
		this.mpg123_app.stdin.write(`V ${vol}\n`);
	}

	kill() {
		this.mpg123_app.kill('SIGINT')
		console.log('killed mpg123 process');
	}
}
module.exports = Mpg123