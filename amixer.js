const util = require('util');
const exec_promise = util.promisify(require('child_process').exec);
const exec = require("child_process").exec;
const AUDIO_CARD = 0 //TLV320AIC plughw:0,0
const offset_min_volume = 20;
//var blueVolBeforeFading
var volBeforeFading

function volume_control(input) {
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
			case 'volumeup':
			case 'volumedown':
				var appvol = 0;
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				appvol = parseInt(stdout.slice(0, stdout.length - 1))
				if (command == 'volumeup') {
					if (appvol < offset_min_volume) appvol = offset_min_volume
					appvol += 10;
					if (appvol > 100) appvol = 100;
				}
				else {
					appvol -= 10;
					if (appvol <= offset_min_volume)
						appvol = 0;
				}
				exec(`amixer -c ${AUDIO_CARD} set PCM ${appvol}%`).on('exit', async() => {
					//console.log('volume level: ' + appvol);
					resolve(appvol)
				})
				break;
			case 'getvolume':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				resolve(parseInt(stdout.slice(0, stdout.length - 1)));
				break;
			case 'setvolume':
				exec(`amixer -c ${AUDIO_CARD} set PCM ${vol}%`).on('exit', async() => {
					console.log('set volume as ' + vol);
					resolve();
				})
				break;

			case 'fadeInVol':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeinvol = parseInt(stdout.slice(0, stdout.length - 1))

				volBeforeFading = fadeinvol
				while(fadeinvol > 30) {
					fadeinvol = fadeinvol - 20
					exec(`amixer -c ${AUDIO_CARD} set PCM ${fadeinvol}%`)
				}
				resolve()
				break;

			case 'fadeOutVol':
				var {stdout} = await exec_promise(`amixer -c ${AUDIO_CARD} sget PCM | grep \'Right:\' | awk -F\'[][]\' \'{ print $2 }\'`);
				var fadeoutvol = parseInt(stdout.slice(0, stdout.length - 1))

				while(fadeoutvol < volBeforeFading) {
					fadeoutvol = fadeoutvol + 20
					exec(`amixer -c ${AUDIO_CARD} set PCM ${fadeoutvol}%`)
				}
				resolve()
				break;
		}
	})
}
module.exports.volume_control = volume_control