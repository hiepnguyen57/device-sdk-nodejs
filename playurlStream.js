const exec = require("child_process").exec;

function intro(url) {
    exec(`wget --no-check-certificate ${url} -O - | mpg123 -`)
}

function audioqueue(AudioQueue) {
    return new Promise(async resolve => {
        if(AudioQueue.length > 0) {
            var url;
            url = AudioQueue.shift();
            console.log(`-->url: ${url}`);
            await exec(`wget --no-check-certificate ${url} -O - | mpg123 -`);
        }
        resolve()
    })
}

module.exports = {
    intro:              intro,
    audioqueue:         audioqueue
}