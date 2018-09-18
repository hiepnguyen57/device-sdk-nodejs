const exec_promise = util.promisify(require('child_process').exec);
const exec = require("child_process").exec;
const AUDIO_CARD = 0 //TLV320AIC plughw:0,0
const offset_min_volume = 25;
var volBeforeFading

exports.volume_control = function(input) {
	return new Promise(async resolve => {
		var command, vol
		var index_str = input.indexOf(" ");

		if (index_str >= 0) {
			command = input.slice(0, index_str);
			vol = input.slice(index_str + 1, input.length);
		}
		else {
			command = input;
		}

		switch(command) {
			case 'volume_up':
			case 'volume_down':
				var appvol = 0;
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				appvol = parseInt(stdout.slice(0, stdout.length - 1))

				console.log('recent volume: ' + appvol);
				if (command == 'appvolup') {
					if (appvol < offset_min_volume) appvol = offset_min_volume
					appvol += 5;
					if (appvol > 100) appvol = 100;
				}
				else {
					appvol -= 5;
					if (appvol <= offset_min_volume)
						appvol = 0;
				}
				if (appvol < offset_min_volume) {
					exec(`amixer -c ${AUDIO_CARD} set PCM 0%`)
				}
				else {
					exec(`amixer -c ${AUDIO_CARD} set PCM ${appvol}%`)
				}
				resolve();
				break;
			case 'get_volume':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				resolve(parseInt(stdout.slice(0, stdout.length - 1)));
				break;
			case 'set_volume':
				exec(`amixer -c ${AUDIO_CARD} set PCM ${vol}%`);
				resolve('set volume as ' + vol);
				break;

			case 'fadeInVol':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeinvol = parseInt(stdout.slice(0, stdout.length - 1))

				volBeforeFading = fadeinvol

				while(fadeinvol > 30) {
					fadeinvol = fadeinvol - 5
					exec(`amixer -c ${AUDIO_CARD} set PCM ${fadeinvol}%`)
				}
				break;

			case 'fadeOutVol':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeoutvol = parseInt(stdout.slice(0, stdout.length - 1))

				while(fadeoutvol < volBeforeFading) {
					fadeoutvol = fadeoutvol + 5
					exec(`amixer -c ${AUDIO_CARD} set PCM ${fadeoutvol}%`)
				}
				break;
		}
	})
}