const exec = require("child_process").exec;
var wakeword_exec

async function start()
{
    if((wakeword_exec === undefined) || (wakeword_exec.killed === true)) {
        console.log('start Wakeword');
        wakeword_exec = exec(`/home/root/maikao_wakeup`)
    }
}

async function stop()
{
    //exec(`ps -ef | grep maikao_wakeup | grep -v grep | awk '{print $2}' | xargs kill`)
    if(wakeword_exec != undefined) {
        wakeword_exec.kill('SIGINT')
    }
}

module.exports = {
    start:            start,
    stop:             stop
}