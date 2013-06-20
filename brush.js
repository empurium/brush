var fs           = require('fs');
var mongo        = require('mongodb');
var ExifImage    = require('exif').ExifImage;

// no trailing slash
var allEventsDir = '/space/Unsorted/Pictures/Picasa';
var exifTypes    = /jpg/i;

fs.readdir(allEventsDir, function(err, events) {
	for (var i = 0; i < events.length; i++) {
		var eventDir = allEventsDir + '/' + events[i];

		console.log(eventDir);

		processEvent(eventDir, events[i]);
	}
});


function processEvent(eventDir, eventName) {
	var eventStart = new Date();
	var eventEnd   = new Date();

	var files = fs.readdirSync(eventDir);
	for (var i = 0; i < files.length; i++) {
		var filePath = eventDir + '/' + files[i];

		if (files[i] === '.picasa.ini') {
			parsePicasaIni(filePath);
			continue;
		}

		var r = files[i].match(/\.(\w{3,4})$/);
		if (r && r.length > 0) {
			var fileExt = r[1];
		}

		// check exif data first
		if (fileExt && fileExt.match(exifTypes)) {
			new ExifImage({ image: filePath }, function(err, exif) {
				//if (err) throw err;

				console.log(filePath + ': ');
				//console.log(exif);
				//console.log('exif.image.ModifyDate: ' + exif.image.ModifyDate);
				//console.log('exif.exif.CreateDate: ' + exif.exif.CreateDate);
				//console.log('exif.exif.DateTimeOriginal: ' + exif.exif.DateTimeOriginal);

				if (exif.exif.DateTimeOriginal) {
					imageDate = parseDate(exif.exif.DateTimeOriginal);
					//console.log(imageDate);

					if (imageDate < eventStart) {
						eventStart = imageDate;
					}
					else if (imageDate > eventEnd) {
						eventEnd = imageDate;
					}
				}
			});
		}

		// fall back to timestamps (unreliable)
		/*
		fs.stat(filePath, function(err, stat) {
			console.log(stat);
		});
		*/
	}
}

function parsePicasaIni(path) {
	/*
	fs.readFile(path, 'ascii', function(err, data) {
		console.log(data);
	});
	*/
}

function parseDate(exifDateString) {
	// 2012:10:30 19:09:16
	var parts = exifDateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
	return new Date(parts[1], parts[2]-1, parts[3], parts[4], parts[5], parts[6]);
}
