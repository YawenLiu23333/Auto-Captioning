/**
 * This file is not used any more, just left over during developing
 */
const splitAudio = require('audio-splitter');
const { spawnSync } = require('child_process');
const fs = require('fs');
// const splitOptions = {
// 	mergedTrack: "Power_English_Update.mp3", // required
// 	outputDir: "videoOutput/", // directory, where to put the tracks (with all the required slashes)
// 	ffmpegPath: "ffmpeg/bin/ffmpeg.exe", // path to ffmpeg.exe
// 	// artist: "ARTIST", // meta info, optional
// 	// album: "ALBUM", // meta info, optional
// 	// trackNames: [], // meta info, optional
// 	maxNoiseLevel: -40, // silence is defined below this dB value
// 	minSilenceLength: 1.4, // (sec) we are searching for silence intervals at least of this lenght
// 	minSongLength: 20 // (sec) if a track is sorter than this, we merge it to the previous track
// };


const pattern = /silence_start: (\d+(\.\d+)?)/g;
/**
 * testing pattern, all good with strings
 * const str = '[silencedetect @ 000001a241fc79c0] silence_start: 0';
 * const str2 = '[silencedetect @ 000001a241fc79c0] silence_start: 132.483';
 * console.log(pattern.exec(str));
 * console.log(pattern.exec(str2));
 */
// const extension = splitOptions.mergedTrack.match(/\w+$/)[0];
// const detectCommand = splitOptions.ffmpegPath + ' -i "' + splitOptions.mergedTrack + '" -af silencedetect=noise=' +
//  splitOptions.maxNoiseLevel + 'dB:d=' + splitOptions.minSilenceLength + ' -f null -';
// // running silence detection
// console.info("Start splitting, splitOptions: ");
// for(var key in splitOptions)
// 	console.log("  " + key + " = " + splitOptions[key]);
// console.log("\Running silence detection, waiting for the output (be patient):\n  " + detectCommand + "\n");
// const command = 'ffmpeg';
/**
 * testing for running command line using child process, not working
 */
//  const args = [
// 	'-i', 'Power_English_Update.mp3',
// 	'-af', 'silencedetect=noise=-30dB:d=0.5',
// 	'-f', 'null',
// 	'-', '2>', 
// 	'vol.txt',
// ];
// const out = spawn('ls', ['-l']);
// exec('dir', (error, stdout, stderr) => {
// 	if (error) {
// 	  console.error(`exec error: ${error}`);
// 	  return;
// 	}
  
// 	console.log(`stdout:\n${stdout}`);
// 	console.error(`stderr:\n${stderr}`);
//   });
// out.stdout.on(
//     'data', (data) => {
//         console.log(`stdout:\n${data}`);
//     }
// );
// out.on(
//     'error', (error) => {
// 		console.error(`Error executing command: ${error}`);
//     }
// );
// out.on('close', (code, signal) => {
// 	if (code !== 0) {
// 	  console.error(`Command exited with code ${code} and signal ${signal}`);
// 	} else {
// 	  console.log(`Command executed successfully`);
// 	}
//   });

/**
 * testing using spawnSync on terminal in windows
 * this generates a vol.txt file which contains silence start and end
 */
const command = spawnSync('powershell.exe', 
['-Command', 'ffmpeg -i "Power_English_Update.mp3" -af silencedetect=noise=-30dB:d=0.5 -f null - 2> vol.txt']);

if (command.status !== 0) {
	console.error(`Command exited with status code ${command.status}`);
	// process.exit(1);
}
/**
 * testing read file generated somehow not working but works if create a new file manually and copied everything to it
 */
fs.readFile('vol.txt','utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	  }
	// console.log(data);
	const lines = data.split('\n');
	for(const line of lines){
		/** finally, found the following line is the key */
		const cleanedData = line.replace(/[^\x20-\x7E]/g, '');
		console.log('line data:' + cleanedData);
		console.log('extracting pattern');
		const matched = pattern.exec(cleanedData.trim());
		if(matched !== null){
			console.log(matched);
		}else{
			console.log('pattern matching failed');
		}
	}
});
// split command example
// ffmpeg -i Power_English_Update.mp3 -acodec copy -ss 00:00:00 -t 00:30:00 half1.mp3