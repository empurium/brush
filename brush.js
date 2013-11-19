var mkdirp    = require('mkdirp');
var async     = require('async');
var fs        = require('fs');
var ExifImage = require('exif').ExifImage;

var unsortedDir = '/space/Unsorted/Pictures/Picasa'; // no trailing slash
var archiveDir  = 'Archive';  // no trailing slash
var exifTypes   = /jpg/i;
var slash       = '/';        // use '\\' on Windows

// find all event directories and process them
fs.readdir(unsortedDir, function(err, events) {
	if (err) throw err;

	async.eachLimit( events, 1, function iter(eventName, next) {
		var eventDir = unsortedDir + slash + eventName;
		processEvent(eventDir, eventName);

		next();
	},
	function done(err) {
		console.log('Finished brushing.');
	});
});




function processEvent(eventDir, eventName) {
	console.log(' ++ ' + eventName);

	var eventStart = new Date();
	var eventEnd   = new Date();
	var eventFiles = [];

	// process each file to figure out this event
	var files = fs.readdirSync(eventDir);
	async.eachLimit(files, 1, function iter(fileName, next) {
		var filePath = eventDir + slash + fileName;

		if (fileName === '.picasa.ini') {
			parsePicasaIni(filePath);
			next();
		} else {
			getFileDate(filePath, function(err, fileDate) {
				if (fileDate < eventStart) {
					eventStart = fileDate;
					eventEnd   = eventStart;
				}
				if (fileDate > eventEnd) {
					eventEnd = fileDate;
				}
				next();
			});
		}
	},
	// now move the files to their new archived location
	function done(err) {
		var year  = eventStart.getFullYear();
		var month = eventStart.getMonth() * 1 + 1;
		    month = month < 10 ? '0' + month : month;
		var newEventDir = archiveDir + slash + year + slash + month + slash + eventName;

		// search for event(s) that have ANY time overlap with this event
		// we will just WARN about overlapping events at first, eventually prompt

		// process each file to figure out this event
		var files = fs.readdirSync(eventDir);
		async.eachLimit(files, 1, function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				fs.stat(filePath, function(err, stat) {
					fs.rename(filePath, newFilePath, function(err) {
						fs.utimes(newFilePath, stat.atime, stat.mtime, function(err) {
							eventFiles.push(newFilePath);
							console.log(' - ' + filePath + ' -> ' + newFilePath);
							next();
						});
					});
				});
			});
		},
		function done(err) {
			console.log(' - started: ' + eventStart);
			console.log(' - ended: ' + eventEnd);
		});
	});

	console.log(' -- Done with ' + eventName + '!\n\n');
}

function parseDate(dateString) {
	// 2012:10:30 19:09:16
	var parts = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
	return new Date(parts[1], parts[2]-1, parts[3], parts[4], parts[5], parts[6]);
}

function getFileDate(filePath, callback) {
	var r = filePath.match(/\.(\w{3,4})$/);
	if (r && r.length > 0) {
		var fileExt = r[1];
	}

	// check exif data first
	/*
	if (fileExt && fileExt.match(exifTypes)) {
		new ExifImage({ image: filePath }, function(err, exif) {
			//if (err) throw err;

			console.log(filePath + ': ');
			//console.log(exif);
			//console.log('exif.image.ModifyDate: ' + exif.image.ModifyDate);
			//console.log('exif.exif.CreateDate: ' + exif.exif.CreateDate);
			//console.log('exif.exif.DateTimeOriginal: ' + exif.exif.DateTimeOriginal);

			if (exif.exif.DateTimeOriginal) {
				var fileDate = parseDate(exif.exif.DateTimeOriginal);
				//console.log(fileDate);

				if (fileDate < eventStart) {
					eventStart = fileDate;
				}
				else if (fileDate > eventEnd) {
					eventEnd = fileDate;
				}
			}
		});
	}
	*/

	// fall back to timestamps (unreliable)
	var fileDate = false;
	fs.stat(filePath, function(err, stat) {
		fileDate = stat.mtime;
		if (fileDate === false) {
			fileDate = stat.mtime;
		}
		if (fileDate === false) {
			fileDate = stat.mtime;
		}

		if (typeof callback === 'function') {
			callback(err, fileDate);
		}
	});
}

function parsePicasaIni(path) {
	/*
	fs.readFile(path, 'ascii', function(err, data) {
		console.log(data);
	});
	*/
}
