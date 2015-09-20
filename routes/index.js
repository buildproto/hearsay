var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');

var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();

var segmentFiles = [];

/* GET home page. */
router.get('/', function(req, res, next) {

	var testString = String("Hey what is GOOD").toLowerCase();
	var durations = [1, 1, 1, 1];
	var words = testString.split(' ');
	var moments = [];
	var i = 0; 
	for (var w in words) {
		moments.push({word: words[w], duration: durations[i]})
		i++;
	}
	console.log(moments);

	async.eachSeries(moments, function iterator(moment, callback) {
		var withHighlight = testString.toLowerCase().replace(moment.word, moment.word.toUpperCase());
		segmentFiles.push(outputFilePath(moment.word)); //FIXME: uniquify
		makeVideoSegment(moment.word, withHighlight, moment.duration, callback);
	}, function done() {
		var audioSource = path.resolve(__dirname, '../public/audio/562.mp3');
		var audioStart = 10;
		var audioEnd = 16;
  		mergeItAll(segmentFiles, audioSource, audioStart, audioEnd, function(result) {
  			res.render('index', { title: 'Finished doing stuff! ' + result  });
  		});
	});
});

function makeVideoSegment(segmentName, text, duration, callback) {
	console.log("Running ffmpeg");
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/woodsmall.jpg'))
		.loop(duration)
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: path.resolve(__dirname, '../public/fonts/feltthat.ttf'),
  				text: text,
  				fontsize: 30,
  				fontcolor: 'red',
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
    		callback();
  		});
}

function outputFilePath(name) {
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

			ffmpeg().input(audioSource)
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
							.save(outputFilePath('mergedFinal'))

		  					.on('error', function(err) {
		  						console.log('Something went wrong on final merge: ' + err.message);
		  						callback(err.message);
		  					})
		  					.on('end', function() {
		  						console.log('Done merging WITH audio');
		  						callback('success');
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
