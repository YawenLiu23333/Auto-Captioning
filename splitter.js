const fs = require('fs');
const path = require('path');
require('dotenv').config();
// do not add g at the end, it goes to global search, somehow not working
const silenceStartPattern = /silence_start: (\d+(\.\d+)?)/;
const silenceEndPattern = /silence_end: (\d+(\.\d+)?)/;
// const pairs = [];
// const pairs = [[ '2.66703', '7.75916' ]];
const { spawnSync } = require('child_process');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  //TODO: put the api key created from chatgpt api
  apiKey: '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'
  // apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


const processOnFile = function(inputFilePath){
    genSilenceDetectionFile(inputFilePath, -30, 0.5);
    // try {
    //     console.log(inputFilePath);
    //     const result = spawnSync('powershell.exe', 
    //       ['-Command', `ffmpeg -i "${inputFilePath}" -af silencedetect=noise=-30dB:d=0.5 -f null - 2> vol.txt`]);
    //   }catch(e){
    //     console.log(e);
    //     res.status(500).send("Error: " + e);
    //   }
    // comment out this line if testing on mp3
    videoToAudio(inputFilePath);
    fs.readFile('vol.txt','utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return;
          }
        // const strlist = [];
        // const datalist = [];
        // for (let i = 0; i < str.length; i++) {
        //     const code = str.charCodeAt(i);
        //     strlist.push(code);
        //   }
        //   const cleanedOnce = data.replace(/[^\x20-\x7E]/g, '');
        //   const cleanedData = cleanedOnce.replace(/\x00/g, '');
        //   for (let i = 0; i < cleanedData.length; i++) {
        //     const code = cleanedData.charCodeAt(i);
        //     datalist.push(code);
        //   }
        //   console.log(strlist);
        //   console.log(datalist);
        //   console.log(silenceEndPattern.exec(cleanedData));
        const pairs = constructSoundIntervals(data);
        // remove sound interval that is too short
        const newPairs = [];
        for(let pair of pairs){
            if(pair[1]-pair[0] > 0.5){
                newPairs.push(pair);
            }
        }
        // console.log(newPairs);
        // start spliting
        for(let i = 0; i < newPairs.length; i++){
            let pair = newPairs[i];
            pair = formatingSoundInterval(pair);
            const result = spawnSync('powershell.exe', ['-Command', `ffmpeg -i test_audio.mp3 -ss ${(pair[0].split(','))[0]}.${(pair[0].split(','))[1]} -to ${(pair[1].split(','))[0]}.${(pair[1].split(','))[1]} -c copy outputDir/output${i}.mp3`]);
            if(result.status !== 0){
                console.log(result.stderr + ' on index ' + i);
            }
        }
        const srtContent = await chatgptAPICall(newPairs);
        // not required for the following code
        fs.appendFile('autoCaption.srt', srtContent, (err) => {
            if (err) throw err;
            console.log('autoCaption SRT file generated');
        });
    });
}
// convertion from mp4 to mp3, takes in the input file path and return the converted file stream
const videoToAudio = async function(inputFilePath){
    try {
        console.log('converting ' + inputFilePath);
        const result = spawnSync('powershell.exe', 
          ['-Command', `ffmpeg -i ${inputFilePath} -vn -acodec libmp3lame test_audio.mp3`]);
        if(result.status == 0){
            console.log('done');
        }else{
            return null;
        }
    }catch(e){
        console.log(e);
        return null;
    }
    return fs.createReadStream('test_audio.mp3');
}
// generate silence detection result file with custom noise and duration parameter. return file stream on the txt file
const genSilenceDetectionFile = async function(inputFilePath,noiseIndB, durationInSeconds){
    try {
        console.log(inputFilePath);
        const result = spawnSync('powershell.exe', 
          ['-Command', `ffmpeg -i "${inputFilePath}" -af silencedetect=noise=${noiseIndB}dB:d=${durationInSeconds} -f null - 2> vol.txt`]);
        if(result.status == 0){
            console.log('done');
        }else{
            return null;
        }
      }catch(e){
        console.log(e);
        return null;
      }
      return fs.createReadStream('vol.txt');
}
// generate srt content based on soundIntervalPairs and corresponding audio file, convert audio to text by chatgpt api call
const chatgptAPICall = async function(pairs){
    let srtFileContent = '';
    for(let i = 0; i < pairs.length; i++){
        try{
        const pair = pairs[i];
        const resp = await openai.createTranscription(
            fs.createReadStream(`outputDir/output${i}.mp3`),
            "whisper-1"
          );
        
        const srtFormatChunk = `${i+1}\n${pair[0]} --> ${pair[1]}\n- ${resp.data.text}\n`;
        // console.log(resp.data.text);
        console.log(srtFormatChunk);
        srtFileContent += srtFormatChunk;
        }catch(e){
            console.log(e);
        }
    }
    return srtFileContent;
}
// sound interval pairs with seconds
const constructSoundIntervals = function(data){
    const pairs = [];
    const lines = data.split('\n');
    // set default to look for silence end
    let matchSilenceStartSwitch = false;
    let pair = [];
	for(const line of lines){
        const cleanedOnce = line.replace(/[^\x20-\x7E]/g, '');
        const cleanedData = cleanedOnce.replace(/\x00/g, '');
        // construct pairs with intervals of sounds
        console.log('line data:' + cleanedData);
        if(!matchSilenceStartSwitch){
            const endMatch = silenceEndPattern.exec(cleanedData);
            if(endMatch !== null){
                pair.push(endMatch[1]);
                matchSilenceStartSwitch = !matchSilenceStartSwitch;
                console.log('matched with end pattern');
                continue;
            }else{
                console.log('not matching end pattern');
            }
        }
        if(matchSilenceStartSwitch){
            const startMatch = silenceStartPattern.exec(cleanedData);
            if(startMatch !== null){
                pair.push(startMatch[1]);
                matchSilenceStartSwitch = !matchSilenceStartSwitch;
                console.log(pair);
                pairs.push(pair);
                // reset pair
                pair = [];
                console.log('matched with start pattern');
                continue;
            }else{
                console.log('not matching start pattern');
            }
        }
	}
    // end from reading through the file
    return pairs;
}
// sound interval formating to hour:minute:second format
const formatingSoundInterval = function(pair){
    const soundStartSeconds = pair[0];
    const soundEndSeconds = pair[1];
    pair[0] = formatDuration(soundStartSeconds);
    pair[1] = formatDuration(soundEndSeconds);
    console.log(pair);
    return pair;
}


/**
 * example command line for split audio
 */
// ffmpeg -i ${process.env['INPUT_FILE']} -ss 00:01:00 -to 00:03:00 -c copy output.mp3

function formatDuration(seconds) {
    const miliseconds = Number.parseFloat(seconds).toFixed(3).split('.')[1];
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')},${miliseconds}`;
}
//to only test functions: uncomment the following line
// test on MP4
// Eric_Clapton_-_Wonderful_Tonight_Lyrics.mp3
// Test_Video.MP4
// processOnFile("Power_English_Update.mp3");
// videoToAudio('Test_Video.MP4');
// const str = '[silencedetect @ 0000022051a479c0] silence_start: 8.58011';
// console.log(silenceStartPattern.exec(str));
module.exports = {
    chatgptAPICall,
    constructSoundIntervals,
    formatingSoundInterval,
    videoToAudio,
    genSilenceDetectionFile,
}