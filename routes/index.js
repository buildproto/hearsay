var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var fs = require('fs');

var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();

var segmentFiles = [];
var fontFilePath = path.resolve(__dirname, '../public/fonts/FiraMono-Regular.otf');

/* GET home page. */
router.get('/', function(req, res, next) {

	if (fs.existsSync(outputFilePath('merged'))) {
		fs.unlinkSync(outputFilePath('merged'));
	}
	if (fs.existsSync(outputFilePath('mergedFinal'))) {
		fs.unlinkSync(outputFilePath('mergedFinal'), function(err) {});
	}

	var returnChar = String.fromCharCode(13);
	var audioStart = 9.5;
	var audioEnd = 13;
	var testString = String("she was reporting on" + returnChar + "the schools in durham" + returnChar + "north carolina").toLowerCase();
	var re = new RegExp(returnChar, 'g');
	var safeString = testString.replace(re, ' ');
	var durations = [.5, .3, .1, .1, .3, .3, .3, .3, .3, .6];
	var words = safeString.split(' ');
	var moments = [];
	var i = 0; 
	for (var w in words) {
		var safeWord = words[w].replace(returnChar, '');
		moments.push({word: safeWord, duration: durations[i]})
		i++;
	}
	console.log(moments);

	var textFilePath = outputFilePath("text", "txt");
	makeIntro(textFilePath, 2, function() {
		//segmentFiles.push(outputFilePath("intro"));

		async.eachSeries(moments, function iterator(moment, callback) {
			var re = new RegExp(moment.word, 'g');
			var withHighlight = testString.toLowerCase().replace(re, moment.word.toUpperCase());
			segmentFiles.push(outputFilePath(moment.word)); //FIXME: uniquify

			var fs = require('fs');
			fs.writeFile(outputFilePath("text", "txt"), withHighlight, function(err) {
				if(err) {
					return console.log(err);
				}
				makeVideoSegment(moment.word, withHighlight, moment.duration, callback);

			}); 
		}, function done() {
			var audioSource = path.resolve(__dirname, '../public/audio/562.mp3');
	  		mergeItAll(segmentFiles, audioSource, audioStart, audioEnd, function(result) {
	  			res.render('index', { title: 'Finished doing stuff! ' + result  });
	  		});
		});

	});


});

function makeIntro(textFilePath, duration, callback) {
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/woodsmall.jpg'))
		.loop(duration)
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: fontFilePath,
  				textfile: textFilePath,
  				fontsize: 32,
  				fontcolor: 'white',
  				x: '(w-text_w)/2',
  				y: '(h-text_h-line_h)/2',
  				shadowcolor: 'black',
  				shadowx: 2,
  				shadowy: 2
  			}
  		})
  		.videoCodec('libx264')  		
  		.addOption('-pix_fmt', 'yuv420p')
		.save(outputFilePath("intro"))
		.on('start', function() {
			console.log("started making intro");
		})
		.on('end', function() {
    		console.log('Done producing segment: intro');
    		console.log("audio path", path.resolve(__dirname, '../public/audio/silence.mp3'));
    		var mergedAudioAndVideo = ffmpeg()
				.input(path.resolve(__dirname, '../public/audio/silence.aac'))
				.input(outputFilePath('intro'))
				
							.audioCodec('copy')
							.videoCodec('copy')
							//.addOption('-shortest')
							.save(outputFilePath('introWithAudio'))

		  					.on('error', function(err) {
		  						console.log('Something went wrong adding audio to intro: ' + err.message);
		  						callback(err.message);
		  					})
		  					.on('end', function() {
		  						console.log("done adding audio silence to intro");
		  						callback("success");
		  					});


    		
  		})
  		.on('error', function(err) {
    		console.log('an error happened: ' + err.message);
    		callback();
  		});
}

function makeVideoSegment(segmentName, text, duration, callback) {
	console.log("Running ffmpeg");
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/woodsmall.jpg'))
		.loop(duration)
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: fontFilePath,
  				text: segmentName,
  				//textfile: outputFilePath("text", "txt"),
  				fontsize: 32,
  				fontcolor: 'white',
  				x: '(w-text_w)/2',
  				y: '(h-text_h-line_h)/2',
  				shadowcolor: 'black',
  				shadowx: 2,
  				shadowy: 2
  			}
  		})
  		.videoCodec('libx264')
  		.addOption('-pix_fmt', 'yuv420p')
		.save(outputFilePath(segmentName))
		.on('end', function() {
    		console.log('Done producing segment:' + segmentName);
    		callback();
  		})
  		.on('error', function(err) {
    		console.log('an error happened: ' + err.message);
    		throw(err);
    		callback();
  		});
}

function outputFilePath(name, extension) {
	if (extension) {
		return __dirname + '/../public/output/' + name + '.' + extension;
	}
	return __dirname + '/../public/output/' + name + '.mp4';
}

function mergeItAll(videoSources, audioSource, audioStart, audioEnd, callback) {
	console.log(videoSources);

	var mergedVideo = ffmpeg();
	videoSources.forEach(function(videoName){
		console.log("adding input", videoName)
		mergedVideo = mergedVideo.addInput(videoName);
	});

/*
	mergedVideo.mergeToFile('./mergedVideo.mp4', './tmp/')
	.on('error', function(err) {
		console.log('Error ' + err.message);
	})
	.on('end', function() {
		console.log('Finished!');
	});
*/

	mergedVideo.mergeToFile(outputFilePath('merged'))  		
		.on('end', function() {
    		console.log('Done merging before audio');

			ffmpeg()
					.input(audioSource)
  					//.addOption('-codec', 'copy')
  					//.addOption('-shortest')
			  		.addOption('-ss', audioStart)
  					.addOption('-to', audioEnd)
  					.save(outputFilePath('audioClip'))
  					.on('error', function(err) {
  						console.log('Something went wrong on audio clipping: ' + err.message);
  						callback(err.message);
  					})
  					.on('end', function() {
  						console.log('Done creating audio clip');

						var mergedAudioAndVideo = ffmpeg()
							.input(outputFilePath('audioClip'))
							.input(outputFilePath('merged'))
							.audioCodec('copy')
							.videoCodec('copy')
							.addOption('-shortest')
							.save(outputFilePath('mergedFinal'))

		  					.on('error', function(err) {
		  						console.log('Something went wrong on final merge: ' + err.message);
		  						callback(err.message);
		  					})
		  					.on('end', function() {
		  						console.log('Done merging WITH audio');
		  						ffmpeg({source: outputFilePath('introWithAudio')})
		  								.mergeAdd(outputFilePath('mergedFinal'))
		  								.mergeToFile(outputFilePath('mergedWithIntro'))
		  								.on('error', function(err) {
		  									console.log('Something went wrong adding intro: ' + err.message);
		  									callback(err.message);
		  								})
		  								.on('end', function() {
		  									console.log("Done prepending intro");
		  									callback("success");
		  								});

		  					});

		  				});

  		})
  		.on('error', function(err) {
    		console.log('Something went wrong on merge: ' + err.message);
    		callback(err.message);
  		})
		//.save(outputFilePath('merged'));

}



module.exports = router;
