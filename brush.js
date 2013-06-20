var fs        = require('fs');
var ExifImage = require('exif').ExifImage;
var mongo     = require('mongodb');

// no trailing slash
var allEventsDir = '/space/Unsorted/Pictures/Picasa';

fs.readdir(allEventsDir, function(err, events) {
	for (var i = 0; i < events.length; i++) {
		var eventDir = allEventsDir + '/' + events[i];
		console.log(eventDir);

		processEvent(eventDir);
	}
});


function processEvent(eventDir)
{
	fs.readdir(eventDir, function(err, files) {
		for (var i = 0; i < files.length; i++) {
			var filePath = eventDir + '/' + files[i];
			console.log(filePath);

			fs.stat(filePath, function(err, stat) {
				//console.log(stat);

				new ExifImage({ image: filePath }, function(err, exif) {
					console.log(exif);
				});
			});
		}
	});
}
