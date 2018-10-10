var record = require('node-record-lpcm16')
var fs = require('fs')
const moment = require('moment')
const readline = require('readline');
const rl = readline.createInterface(process.stdin, process.stdout);

var file_name = null
var file = null;

function startRecording() {
	file_name = moment().format("YYYYMMDDHHmmss") + '.wav'
	file = fs.createWriteStream(file_name, { encoding: 'binary' })
	record.start({
		sampleRate: 	16000,
		channels: 		1,
		verbose: 		true,
		recordProgram: 	'arecord', // Try also "rec" or "sox"
		device: 		'plughw:1,0',
	})
	.pipe(file)
	console.log('speak now!!!!!');

	// Stop recording after three seconds
	setTimeout(function () {
		record.stop()
		file.end()
	}, 3000)
}

/**
 * CTRL+C signal.
 */
process.on('SIGINT', function () {
	process.exit()
});

function promptInput(prompt, handler) {
    rl.question(prompt, input => {
        if (handler(input) !== false) {
            promptInput(prompt, handler);
        }
        else {
            rl.close();
        }
    });
}

function main() {
	promptInput('record#', input => {
	    var command, arg;
	    var index_str = input.indexOf(" ");

	    if (index_str >= 0) {
	        command = input.slice(0, index_str);
	        arg = input.slice(index_str + 1, input.length);
	    }
	    else {
	        command = input;
	    }


		switch(command) {
		    case 'r':
		    	//start recording
		    	startRecording()
		    	break;
		}
	})
}
main()