const fs = require('fs')
const lame = require('lame');
const wav = require('wav')

var input = fs.createReadStream('wav-file.wav');
var output = fs.createWriteStream('lamemp3-file.mp3');

// // start reading the WAV file from the input
// var reader = new wav.Reader();

// // and start transferring the data
// input.pipe(reader)

// // we have to wait for the "format" event before we can start encoding
// reader.on('format', onFormat);

// function onFormat (format) {
// 	console.log('WAV format: %j', format);

// 	// encoding the wave file into an MP3 is as simple as calling pipe()
// 	var encoder = new lame.Encoder(format);
// 	reader.pipe(encoder).pipe(output);
// }

// create the Encoder instance
var encoder = new lame.Encoder({
  // input
  channels: 1,        // 2 channels (left and right)
  bitDepth: 16,       // 16-bit samples
  sampleRate: 44100,  // 44,100 Hz sample rate

  // output
  bitRate: 128,
  outSampleRate: 44100,
  mode: lame.STEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
});

// raw PCM data from stdin gets piped into the encoder
input.pipe(encoder);

// the generated MP3 file gets piped to stdout
encoder.pipe(output);