## Synopsis

This was a hackathon project for audiohackathon 2015 (audiohackathon.com). 

This is a library that, given a quote with word by word timestamps and a source audiofile, outputs an animated version of that quote with synced audio in mp4 format (for ease of shareability).

## Code Example

This is a node-wrapped series of ffmpeg operations. See hearsay.js for details.


## Installation

You need to make sure you have ffmpeg installed with libfreetype (drawtext) capability.

see: https://trac.ffmpeg.org/wiki/CompilationGuide/MacOSX
I think I used this incantation:
`brew install ffmpeg --with-fdk-aac --with-ffplay --with-freetype --with-libass --with-libquvi --with-libvorbis --with-libvpx --with-opus --with-x265`

## API Reference

FFMPEG docs (LOL):
https://ffmpeg.org/ffmpeg.html

fluent-ffmpeg node module:
https://github.com/fluent-ffmpeg/node-fluent-ffmpeg

## Tests

Next on my list (not)

## Contributors

@oneropero
@tylrfishr
@bengold


