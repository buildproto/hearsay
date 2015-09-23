// Hearsay module to produce an mp4 of a quote

var path = require('path');
var async = require('async');
var fs = require('fs');

var ffmpeg = require('fluent-ffmpeg');

module.exports = {
	_segmentFiles: [],
	_fontFilePath: path.resolve(__dirname, '../public/fonts/Palatino.ttc'),
	_boldFontFilePath: path.resolve(__dirname, '../public/fonts/ag-helvetica-bold-35361.ttf'),
	_width: 1012,
	_height: 506, // NOTE: The dimensions are largely governed by the bg.png size

	renderQuoteVideo: function(options, callback) {
		var self = this;

		self._segmentFiles = [];
		var moments = [];
		var i = 0; 
		/*
		for (var w in options.words) {
			// TODO: sanitize words
			moments.push({word: options.words[w].word, duration: options.words[w].duration})
			i++;
		}
		*/
		moments = options.words;
		console.log(moments);
		var quoteFilePath = this.outputFilePath("quote", "txt");
		fs.writeFileSync(quoteFilePath, options.quote);

		self.makeIntro(quoteFilePath, options.attribution, options.introDuration, function(err) {
			if (err) {
				throw(err);
				return;
			}
			async.eachSeries(moments, function iterator(moment, callback) {
				var re = new RegExp(moment.word, 'g');
				self._segmentFiles.push(self.outputFilePath(moment.word)); //FIXME: uniquify
		
				self.makeVideoSegment(moment.word, moment.duration, callback);

				
			}, function done() {
				self.mergeItAll(self._segmentFiles, options.audioSource, options.audioStart, options.audioEnd, function(err) {
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