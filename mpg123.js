const {spawn} = require("child_process")
const STATUS_PLAY = 1
const STATUS_PAUSE = 2
const STATUS_STOP = 3

class Mpg123 {
	constructor() {
		this.status = 0
		this.mpg123_app = spawn('mpg123', ['-R']);
		this.mpg123_app.stdin.setEncoding('utf8');

		this.mpg123_app.stdout.on('data', function(data) {
			const text = data.toString('utf8')
			if(text.search("@P 0") >= 0) {
				console.log('song ended');
			}
		})
	}

	set_source(source) {
		this.status = STATUS_PLAY
		console.log('song url as: ' + source);
		this.mpg123_app.stdin.write(`L ${source}\n`);
		console.log('source loaded');
	}

	pause() {
		if(this.status == STATUS_PLAY) {
			this.mpg123_app.stdin.write(`P\n`);
			this.status = STATUS_PAUSE
		}
		else
			console.log('Mpg123 is already paused');
	}

	play() {
		if(this.status == STATUS_PAUSE) {
			this.mpg123_app.stdin.write(`P\n`)
			this.status = STATUS_PLAY
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