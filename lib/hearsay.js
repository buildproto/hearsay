var path = require('path');
var async = require('async');
var fs = require('fs');

var ffmpeg = require('fluent-ffmpeg');

module.exports = {
	_segmentFiles: [],
	//var fontFilePath = path.resolve(__dirname, '../public/fonts/FiraMono-Regular.otf');
	_fontFilePath: path.resolve(__dirname, '../public/fonts/Palatino.ttc'),
	//var boldFontFilePath = path.resolve(__dirname, '../public/fonts/HelveticaNeueDeskInterface.ttc');
	_boldFontFilePath: path.resolve(__dirname, '../public/fonts/ag-helvetica-bold-35361.ttf'),
	_audioSource: path.resolve(__dirname, '../public/audio/559.mp3'),
	//var fontFilePath = path.resolve(__dirname, '../public/fonts/FiraMono-Regular.otf');
	_fontFilePath: path.resolve(__dirname, '../public/fonts/Palatino.ttc'),
	//var boldFontFilePath = path.resolve(__dirname, '../public/fonts/HelveticaNeueDeskInterface.ttc');
	_boldFontFilePath: path.resolve(__dirname, '../public/fonts/ag-helvetica-bold-35361.ttf'),
	
	_audioSource: path.resolve(__dirname, '../public/audio/559.mp3'),
	_audioStart: 574.5,
	_audioEnd: 610,
	_width: 1012,
	_height: 506,
	_returnChar: String.fromCharCode(13),

	renderQuoteVideo: function(options, callback) {
		var self = this;

/*
		if (fs.existsSync(self.outputFilePath('merged'))) {
			fs.unlinkSync(self.outputFilePath('merged'));
		}
		if (fs.existsSync(self.outputFilePath('mergedFinal'))) {
			fs.unlinkSync(self.outputFilePath('mergedFinal'), function(err) {});
		}
		*/

		var quote = String("I said, \"What\'s the" + self._returnChar + "status on the cookies?" + self._returnChar + "Yarr. Me so hungry,\"");
		var words = String("I said What\'s the status on the cookies? Yarr. Me so hungry").split(' ');
		var author = "TOREY MALATIA - TAL #559";
		var durations = [.4, .5, .2, .2, .2, .2, .2, .7, 1.2, .3, .3, .9];
		
		var introDuration = 2; // 2 seconds for intro quote display
		var moments = [];
		var i = 0; 
		for (var w in words) {
			// TODO: sanitize words
			moments.push({word: words[w], duration: durations[i]})
			i++;
		}
		console.log(moments);
		var quoteFilePath = this.outputFilePath("quote", "txt");
		fs.writeFileSync(quoteFilePath, quote);

		self.makeIntro(quoteFilePath, author, introDuration, function(err) {
			if (err) {
				throw(err);
				return;
			}
			async.eachSeries(moments, function iterator(moment, callback) {
				var re = new RegExp(moment.word, 'g');
				self._segmentFiles.push(self.outputFilePath(moment.word)); //FIXME: uniquify
		
				self.makeVideoSegment(moment.word, moment.duration, callback);

				
			}, function done() {
				self.mergeItAll(self._segmentFiles, self._audioSource, self._audioStart, self._audioEnd, function(err) {
					if (err) {
						throw(err);
					}
					callback();
					return;
				});
			});

		});
	},

	// Helper methods
	makeIntro: function(textFilePath, author, duration, callback) {
		var self = this;
		var destPath = self.outputFilePath("intro");
		self.removeFile(destPath);

		ffmpeg()
			.input(path.resolve(__dirname, '../public/images/bg.png'))
			.loop(duration)
			.videoFilters({
	  			filter: 'drawtext',
	  			options: {
	  				fontfile: self._fontFilePath,
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
					fontfile: self._boldFontFilePath,
					text: author,
					fontsize: 40,
					fontcolor: 'white',
					x: 70,
					//y: '(h-text_h-line_h)/2 - 30'
					y: self.height - 80
				}
			})
	  		.videoCodec('libx264')
	  		.input(path.resolve(__dirname, '../public/audio/silence.aac'))
	  		.audioCodec('aac')		
	  		.addOption('-pix_fmt', 'yuv420p')
			.save(destPath)
			.on('start', function(commandLine) {
				console.log('Started making intro with command: ' + commandLine);
			})
			.on('end', function() {
	    		console.log('Done producing segment: intro');
	    		callback();
	  		})
	  		.on('error', function(err) {
	    		console.log('an error happened: ' + err.message);
	    		callback(err);
	  		});
	},
	makeVideoSegment: function(word, duration, callback) {
		var self = this;
		var destPath = self.outputFilePath(word);
		self.removeFile(destPath);

		ffmpeg()
			.input(path.resolve(__dirname, '../public/images/bg.png'))
			.loop(duration)
			.videoFilters({
	  			filter: 'drawtext',
	  			options: {
	  				fontfile: self._fontFilePath,
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
			.save(destPath)
			.on('start', function(commandLine) {
				console.log('Started making segment ' + word + ' with command: ' + commandLine);
			})
			.on('end', function() {
	    		console.log('Done producing segment:' + word);
	    		callback();
	  		})
	  		.on('error', function(err) {
	    		console.log('an error happened: ' + err.message);
	    		callback(err);
	  		});
	},
	mergeItAll: function(videoSources, audioSource, audioStart, audioEnd, callback) {
		var self = this;
		console.log(videoSources);
		var mergedVideo = ffmpeg();
		videoSources.forEach(function(videoName){
			console.log("adding input", videoName)
			mergedVideo = mergedVideo.addInput(videoName);
		});

		var destPath = self.outputFilePath("merged");
		self.removeFile(destPath);

		mergedVideo.mergeToFile(destPath)  	
			.on('start', function(commandLine) {
				console.log('Started mergin segments with command: ' + commandLine);
			})
	  		.on('error', function(err) {
	    		console.log('Something went wrong on merge: ' + err.message);
	    		callback(err);
	  		})
			.on('end', function() {
	    		console.log('Done merging segments before audio');

	    		var destPath = self.outputFilePath("audioClip");
	    		self.removeFile(destPath);

				ffmpeg()
						.input(audioSource)
				  		.addOption('-ss', audioStart)
	  					.addOption('-to', audioEnd)
	  					.save(destPath)

	  					.on('start', function(commandLine) {
	  						console.log('Started making audio clip with command: ' + commandLine);
	  					})
	  					.on('error', function(err) {
	  						console.log('Something went wrong on audio clipping: ' + err.message);
	  						callback(err.message);
	  					})
	  					.on('end', function() {
	  						console.log('Done creating audio clip');

							var destPath = self.outputFilePath("mergedFinal");
							self.removeFile(destPath);

							ffmpeg()
								.input(self.outputFilePath('audioClip'))
								.input(self.outputFilePath('merged'))
								.audioCodec('copy')
								.videoCodec('copy')
								.addOption('-shortest')
								.save(destPath)
								.on('start', function(commandLine) {
									console.log('Started final merge with command: ' + commandLine);
								})
			  					.on('error', function(err) {
			  						console.log('Something went wrong on final merge: ' + err.message);
			  						callback(err.message);
			  					})
			  					.on('end', function() {
			  						console.log('Done merging WITH audio');
			  						var introPath = self.outputFilePath('intro');
			  						var mergedPath = self.outputFilePath('mergedFinal');

									var destPath = self.outputFilePath("mergedWithIntro");
									self.removeFile(destPath);

			  						ffmpeg().input(introPath)
			  								.input(mergedPath)
			  								.mergeToFile(destPath)
			  								.on('start', function(commandLine) {
			  									console.log('Spawned Ffmpeg with command: ' + commandLine);
			  								})
			  								.on('error', function(err) {
			  									console.log('Something went wrong adding intro: ' + err.message);
			  									callback(err);
			  								})
			  								.on('end', function() {
			  									console.log("Done prepending intro");
			  									callback();
			  								});
			  					});

			  				});

	  		})
	},
	outputFilePath: function(name, extension) {
		if (extension) {
			return path.resolve(__dirname, '../public/output/' + name + '.' + extension);
		}
		return path.resolve(__dirname, '../public/output/' + name + '.mp4');
	},
	removeFile: function(path) {
		if (fs.existsSync(path)) {
			fs.unlinkSync(path);
		}
	}

};