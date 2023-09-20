const express = require('express');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");
const { spawnSync } = require('child_process');
const splitter = require('../splitter');
require('dotenv').config();

const configuration = new Configuration({
  apiKey: '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'
  // apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *  name: AutoCaption
 *  description: everything about auto captions
 */
/**
    * @swagger
    * /videos/srtGeneration:
    *   post:
    *     summary: generates srt text content by uploading mp3 file in request body.
    *     tags: [AutoCaption]
    *     parameters:
    *       - name: inputFile
    *         in: formData
    *         description: The file to upload
    *         required: true
    *         type: file
    *     responses:
    *       200:
    *         description: text content.
    *         content:
    *           application/json:
    *             schema:
    *               type: string
    *       500:
    *         description: Error on request.
    */
router.post('/srtGeneration', async (req, res) => {
  try{
    let body = Buffer.alloc(0);
    
    req.on('data', (chunk) =>{
      body = Buffer.concat([body, chunk]);
    }).on('end', () =>{
      // Write the file data to disk
      fs.writeFile('test_audio.mp3', body, async(err) => {
        if (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('Error writing file');
        } else {
          await splitter.genSilenceDetectionFile("test_audio.mp3", -30, 0.5);
          fs.readFile('vol.txt','utf8', async (err, data) => {
            if (err) {
                console.error(err);
                return;
              }
            const pairs = splitter.constructSoundIntervals(data);
            const newPairs = [];
            for(let pair of pairs){
                if(pair[1]-pair[0] > 0.5){
                    newPairs.push(pair);
                }
            }
            // start spliting
            for(let i = 0; i < newPairs.length; i++){
                let pair = newPairs[i];
                pair = splitter.formatingSoundInterval(pair);
                const result = spawnSync('powershell.exe', ['-Command', `ffmpeg -i test_audio.mp3 -ss ${(pair[0].split(','))[0]}.${(pair[0].split(','))[1]} -to ${(pair[1].split(','))[0]}.${(pair[1].split(','))[1]} -c copy outputDir/output${i}.mp3`]);
                if(result.status !== 0){
                    console.log(result.stderr + ' on index ' + i);
                }
            }
            const srtContent = await splitter.chatgptAPICall(newPairs);
            res.status(200).send(srtContent);
            // remove all files in outputDir and remove vol.txt
            fs.unlink('test_audio.mp3', (err) => {
              if(err) throw err;
              console.log('removed test_audio.mp3');
            });
            fs.unlink('vol.txt', (err) => {
              if(err) throw err;
              console.log('removed vol.txt');
            })
            const directoryPath = 'outputDir';
            fs.readdir(directoryPath, (err, files) => {
              if (err) throw err;
              for (const file of files) {
                fs.unlink(path.join(directoryPath, file), (err) => {
                  if (err) throw err;
                  console.log(`Deleted file: ${file}`);
                });
              }
            });
        });
        }
      });
    });
  }catch(e){
    console.log(e);
    res.status(500).send(e);
  }
  });
/**
    * @swagger
    * /videos/intervals:
    *   post:
    *     summary: generates video sound intervals from upload the correct txt file.
    *     tags: [AutoCaption]
    *     parameters:
    *       - name: inputFile
    *         in: formData
    *         description: The file to upload
    *         required: true
    *         type: file
    *     responses:
    *       200:
    *         description: text content.
    *         content:
    *           application/json:
    *             schema:
    *               type: string
    *       500:
    *         description: Error on request.
    */
router.post('/intervals', async (req, res) => {
  const writeStream = fs.createWriteStream('silenceDetection.txt');

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      console.log('File saved');
      try{
        fs.readFile('silenceDetection.txt','utf8', async (err, data) => {
          if (err) {
              console.error(err);
              return;
            }
          const pairs = splitter.constructSoundIntervals(data);
          const newPairs = [];
          for(let pair of pairs){
              if(pair[1]-pair[0] > 0.5){
                  newPairs.push(pair);
              }
          }
          res.status(200).send(newPairs);
          fs.unlink('silenceDetection.txt', (err) => {
            if(err) throw err;
            console.log('removed silenceDetection.txt');
          });
      });
      }catch(e){
        res.end('Error');
      }
    });

    writeStream.on('error', (err) => {
      console.error(err);
      res.statusCode = 500;
      res.end('Error writing file');
    });

});
/**
    * @swagger
    * /videos/silenceDetectionFile:
    *   post:
    *     summary: return content from silence detection by upload a file in request body.
    *     tags: [AutoCaption]
    *     parameters:
    *       - name: inputFile
    *         in: formData
    *         description: The file to upload
    *         required: true
    *         type: file
    *     responses:
    *       200:
    *         description: text content.
    *         content:
    *           application/json:
    *             schema:
    *               type: string
    *       500:
    *         description: Error on request.
    */
router.post('/silenceDetectionFile', async(req, res) =>{
  try{
    let body = Buffer.alloc(0);
    
    req.on('data', (chunk) =>{
      body = Buffer.concat([body, chunk]);
    }).on('end', () =>{
      // Write the file data to disk
      fs.writeFile('test_audio.mp3', body, async(err) => {
        if (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('Error writing file');
        } else {
          res.setHeader('Content-Type', 'application/octet-stream');
          const silenceFileStream = await splitter.genSilenceDetectionFile("test_audio.mp3", -30, 0.5);
          silenceFileStream.pipe(res);
          fs.unlink('test_audio.mp3', (err) => {
            if(err) throw err;
            console.log('removed test_audio.mp3');
          });
          fs.unlink('vol.txt', (err) => {
            if(err) throw err;
            console.log('removed vol.txt');
          });
        }
      });
    });
  }catch(e){
    console.log(e);
    res.status(500).send(e);
  }
});
/**
    * @swagger
    * /videos/videoToAudio:
    *   post:
    *     summary: return audio file in mp3 from upload mp4 file in request body.
    *     tags: [AutoCaption]
    *     parameters:
    *       - name: inputFile
    *         in: formData
    *         description: The file to upload
    *         required: true
    *         type: file
    *     responses:
    *       200:
    *         description: text content.
    *         content:
    *           application/json:
    *             schema:
    *               type: string
    *       500:
    *         description: Error on request.
    */
 router.post('/videoToAudio', async(req, res) =>{
  const writeStream = fs.createWriteStream('test.MP4');
  req.pipe(writeStream);
  writeStream.on('finish', async() => {
    console.log('File saved');
    res.end('File saved');
    const fileStream = await splitter.videoToAudio('test_video.MP4');
    fileStream.pipe(res);
    fs.unlink('test_audio.mp3', (err) => {
      if(err) throw err;
      console.log('removed test_audio.mp3');
    });
  });

  writeStream.on('error', (err) => {
    console.error(err);
    res.statusCode = 500;
    res.end('Error writing file');
  });
});
router.get('/test', async(req, res) => {
  try{
    res.status(200).send('Hello world');
  }catch(err){
    res.status(500).send("Error:" + err);
  }
})
// Export the router
module.exports = router;