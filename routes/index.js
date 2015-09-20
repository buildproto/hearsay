var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var fs = require('fs');

var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();

var segmentFiles = [];
//var fontFilePath = path.resolve(__dirname, '../public/fonts/FiraMono-Regular.otf');
var fontFilePath = path.resolve(__dirname, '../public/fonts/Palatino.ttc');
//var boldFontFilePath = path.resolve(__dirname, '../public/fonts/HelveticaNeueDeskInterface.ttc');
var boldFontFilePath = path.resolve(__dirname, '../public/fonts/ag-helvetica-bold-35361.ttf');

var audioSource = path.resolve(__dirname, '../public/audio/559.mp3');
var width = 1012;
var height = 506;


/* GET home page. */
router.get('/', function(req, res, next) {

	if (fs.existsSync(outputFilePath('merged'))) {
		fs.unlinkSync(outputFilePath('merged'));
	}
	if (fs.existsSync(outputFilePath('mergedFinal'))) {
		fs.unlinkSync(outputFilePath('mergedFinal'), function(err) {});
	}

	var returnChar = String.fromCharCode(13);
	var audioStart = 574.5;
	var audioEnd = 610;
	//var testString = String("she was reporting on" + returnChar + "the schools in durham" + returnChar + "north carolina").toLowerCase();
	var quote = String("I said, \"What\'s the" + returnChar + "status on the cookies?" + returnChar + "Yarr. Me so hungry,\"");
	var words = String("I said What\'s the status on the cookies? Yarr. Me so hungry").split(' ');
	var author = "TOREY MALATIA - TAL #559";
	var durations = 		[.4, .5, .2, .2, .2, .2, .2, .7, 1.2, .3, .3, .9];
	// captain's log #559
	var moments = [];
	var i = 0; 
	for (var w in words) {
		var safeWord = words[w].replace(returnChar, '');
		moments.push({word: safeWord, duration: durations[i]})
		i++;
	}
	console.log(moments);

	var textFilePath = outputFilePath("text", "txt");
	makeIntro(textFilePath, author, 2, function() {
		async.eachSeries(moments, function iterator(moment, callback) {
			var re = new RegExp(moment.word, 'g');
			segmentFiles.push(outputFilePath(moment.word)); //FIXME: uniquify
			
			fs.writeFile(outputFilePath("text", "txt"), quote, function(err) {
				if(err) {
					return console.log(err);
				}
				makeVideoSegment(moment.word, moment.duration, callback);

			}); 
		}, function done() {
	  		mergeItAll(segmentFiles, audioSource, audioStart, audioEnd, function(result) {
	  			res.render('index', { title: 'Finished doing stuff! ' + result  });
	  		});
		});

	});


});

function makeIntro(textFilePath, author, duration, callback) {
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/bg.png'))
		.loop(duration)
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: fontFilePath,
  				textfile: textFilePath,
  				fontsize: 80,
  				fontcolor: 'white',
  				//x: '(w-text_w)/2',
  				x: 70,
  				y: '(h-text_h-line_h)/2 - 30'
  			}
  		})
		.videoFilters({
			filter: 'drawtext',
			options: {
				fontfile: boldFontFilePath,
				text: author,
				fontsize: 40,
				fontcolor: 'white',
				x: 70,
				y: height - 80
			}
		})
  		.videoCodec('libx264')
  		.input(path.resolve(__dirname, '../public/audio/silence.aac'))
  		.audioCodec('aac')		
  		.addOption('-pix_fmt', 'yuv420p')
		.save(outputFilePath("intro"))
		.on('start', function() {
			console.log("started making intro");
		})
		.on('end', function() {
    		console.log('Done producing segment: intro');
    		callback("success");
  		})
  		.on('error', function(err) {
    		console.log('an error happened: ' + err.message);
    		callback();
  		});
}

function makeVideoSegment(word, duration, callback) {
	console.log("Running ffmpeg");
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/bg.png'))
		.loop(duration)
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: fontFilePath,
  				text: word,
  				//textfile: outputFilePath("text", "txt"),
  				fontsize: 120,
  				fontcolor: 'white',
  				x: '(w-text_w)/2',
  				y: '(h-text_h-line_h)/2+40'
  			}
  		})
  		.videoCodec('libx264')
  		.addOption('-pix_fmt', 'yuv420p')
		.save(outputFilePath(word))
		.on('end', function() {
    		console.log('Done producing segment:' + word);
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
		return path.resolve(__dirname, '../public/output/' + name + '.' + extension);
		//return __dirname + '/../public/output/' + name + '.' + extension;
	}
	return path.resolve(__dirname, '../public/output/' + name + '.mp4');
}

function mergeItAll(videoSources, audioSource, audioStart, audioEnd, callback) {
	console.log(videoSources);

	var mergedVideo = ffmpeg();
	videoSources.forEach(function(videoName){
		console.log("adding input", videoName)
		mergedVideo = mergedVideo.addInput(videoName);
	});

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
		  						var introPath = outputFilePath('intro');
		  						var mergedPath = outputFilePath('mergedFinal');

		  						ffmpeg().input(outputFilePath('intro'))
		  								.input(outputFilePath('mergedFinal'))
		  								.mergeToFile(outputFilePath('mergedWithIntro'))
		  								.on('start', function(commandLine) {
		  									console.log('Spawned Ffmpeg with command: ' + commandLine);
		  								})
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


function writeConcatFile(callback) {
	fs.writeFile(outputFilePath("concatFiles", "txt"), withHighlight, function(err) {
		if(err) {
			return console.log(err);
		}
		callback();
	}); 
}


module.exports = router;
