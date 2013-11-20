var mkdirp    = require('mkdirp');
var async     = require('async');
var fs        = require('fs');
var ExifImage = require('exif').ExifImage;

//var unsortedDir = '/space/Unsorted/Pictures/Picasa'; // no trailing slash
var unsortedDir = '/home/empurium/code/brush/pics';     // no trailing slash
var archiveDir  = '/home/empurium/code/brush/archive';  // no trailing slash
var exifTypes   = /jpg/i;
var slash       = '/';        // use '\\' on Windows

var eventInfo = [];

// find all event directories and process them
fs.readdir(unsortedDir, function(err, events) {
	if (err) throw err;

	async.eachLimit( events, 1, function iter(eventName, next) {
		var eventDir = unsortedDir + slash + eventName;
		decideEventTime(eventDir, eventName);

		next();
	});
});




function decideEventTime(eventDir, eventName) {
	var eventStart            = new Date();
	var eventEnd              = new Date();
	    eventInfo[eventDir] = [];

	var files = fs.readdirSync(eventDir);

	async.eachLimit(files, 1,
		function iter(fileName, next) {
			var filePath = eventDir + slash + fileName;

			if (fileName === '.picasa.ini') {
				next();
			} else {
				getFileDate(filePath, function(fileDate) {
					if (fileDate < eventStart) {
						eventStart = fileDate;
						eventEnd   = eventStart;
					}
					if (fileDate > eventEnd) {
						eventEnd = fileDate;
					}

					eventInfo[eventDir]['start'] = eventStart;
					eventInfo[eventDir]['end']   = eventEnd;

					next();
				});
			}
		},
		function done(err) {
			var year  = eventStart.getFullYear();
			var month = eventEnd.getMonth() * 1 + 1;
			    month = (month < 10) ? '0' + month : month;
			var newEventDir = archiveDir + slash + year + slash + month + slash + eventName;

			console.log(eventName + ' began: ' + eventStart);
			console.log(eventName + ' ended: ' + eventEnd);

			moveFiles(eventName, eventDir, newEventDir);
		}
	);
}

function moveFiles(eventName, eventDir, newEventDir) {
	var files = fs.readdirSync(eventDir);

	async.eachLimit(files, 1,
		function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				//fs.rename(filePath, newFilePath, function(err) {
					//console.log(' - ' + filePath + ' -> ' + newFilePath);
					eventInfo[eventDir]['files'].push(newFilePath);
					next();
				//});
			});
		}
	);
}

function parseDate(dateString) {
	// 2012:10:30 19:09:16
	var parts = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
	return new Date(parts[1], parts[2]-1, parts[3], parts[4], parts[5], parts[6]);
}

function getFileDate(filePath, callback) {
	var fileDate = false;

	var r = filePath.match(/\.(\w{3,4})$/);
	if (r && r.length > 0) {
		var fileExt = r[1];
	}

	// check exif data first
	if (fileExt && fileExt.match(exifTypes)) {
		new ExifImage({ image: filePath }, function(err, exif) {
			//if (err) throw err;

			//console.log('exif.image.ModifyDate: ' + exif.image.ModifyDate);
			//console.log('exif.exif.CreateDate: ' + exif.exif.CreateDate);
			//console.log('exif.exif.DateTimeOriginal: ' + exif.exif.DateTimeOriginal);

			if (exif && exif.exif && exif.exif.DateTimeOriginal) {
				fileDate = parseDate(exif.exif.DateTimeOriginal);
				console.log(filePath + ' EXIF DATE: ' + fileDate);

				if (typeof callback === 'function') {
					callback(fileDate);
				}
			}
		});
	}

	// fall back to timestamps (unreliable)
	fs.stat(filePath, function(err, stat) {
		fileDate = stat.mtime;
		if (fileDate === false) {
			fileDate = stat.mtime;
		}
		if (fileDate === false) {
			fileDate = stat.mtime;
		}
		console.log(filePath + ' DATE STAMP: ' + fileDate);

		if (typeof callback === 'function') {
			callback(fileDate);
		}
	});
}
