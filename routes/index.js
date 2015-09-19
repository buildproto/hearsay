var express = require('express');
var router = express.Router();
var path = require('path');

var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();

/* GET home page. */
router.get('/', function(req, res, next) {
	testCmd();
  res.render('index', { title: 'Express' });
});


function testCmd() {
	//ffmpeg -f lavfi -i color=c=blue:s=320x240:d=0.5 -vf "drawtext=fontfile=./feltthat.ttf:fontsize=30: \
	//fontcolor=white:x=(w-text_w)/2:y=(h-text_h-line_h)/2:text='Hey, what's good?'" output.mp4
	console.log("Running ffmpeg");
	/*ffmpeg('color=c=blue:s=320x240:d=0.5')
		.output('../public/output/quote.mp4');
		*/
	ffmpeg()
		.input(path.resolve(__dirname, '../public/images/woodsmall.jpg'))
		.loop('1:00')
		.videoFilters({
  			filter: 'drawtext',
  			options: {
  				fontfile: path.resolve(__dirname, '../public/fonts/feltthat.ttf'),
  				text: 'Hey what is GOOD!?',
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
		.save(__dirname + '/../public/output/output.mp4')
		.on('end', function() {
    		console.log('file has been converted succesfully');
  		})
  		.on('error', function(err) {
    		console.log('an error happened: ' + err.message);
  		});
	//console.log("DONE Running ffmpeg");
}

module.exports = router;
