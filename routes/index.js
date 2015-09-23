var express = require('express');
var router = express.Router();
var path = require('path');
var hearsay = require('../lib/hearsay');


/* GET home page. */
router.get('/', function(req, res, next) {
	var returnChar = String.fromCharCode(13);
	var options = {
		audioSource: path.resolve(__dirname, '../public/audio/559.mp3'),
		audioStart: 574.5,
		audioEnd: 610,
		quote: String("I said, \"What\'s the" + returnChar + "status on the cookies?" + returnChar + "Yarr. Me so hungry,\""),
		words: [
			{word: "I", duration: .4},
			{word: "said", duration: .5},
			{word: "What\'s", duration: .2},
			{word: "the", duration: .2},
			{word: "status", duration: .2},
			{word: "on", duration: .2},
			{word: "the", duration: .2},
			{word: "cookies?", duration: .7},
			{word: "Yarr.", duration: 1.2},
			{word: "Me", duration: .3},
			{word: "so", duration: .3},
			{word: "hungry", duration: .8}
		],
		introDuration: 2,		
		attribution: "TOREY MALATIA - TAL #559",
	};

	hearsay.renderQuoteVideo(options, function(result) {
		res.render('index', { title: 'Hearsay ', inputs: options });
	});

});

module.exports = router;
