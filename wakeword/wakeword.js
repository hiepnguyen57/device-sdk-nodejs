const exec = require("child_process").exec;
var wakeword_exec

async function start()
{
    if((wakeword_exec === undefined) || (wakeword_exec.killed === true)) {
        console.log('start Wakeword');
        wakeword_exec = exec(`/home/root/wakeword-snsr -t /home/root/model/spot-hbg-enUS-1.3.0-m.snsr`)
    }
}

async function stop()
{
    wakeword_exec.kill('SIGINT')
}

module.exports = {
    start:            start,
    stop:             stop
}
