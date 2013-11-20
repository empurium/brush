var mkdirp        = require('mkdirp');
var async         = require('async');
var fs            = require('fs');
var child_process = require('child_process');
var ExifImage     = require('exif').ExifImage;

//var unsortedDir = '/space/Unsorted/Pictures/Picasa'; // no trailing slash

var unsortedDir = '/space/Unsorted/Pictures/Picasa';   // no trailing slash
var archiveDir  = '/space/Unsorted/Pictures/Archive';  // no trailing slash

var archiveType = 'copy';     // copy or move pictures?

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
			// skip picasa.ini files, they will give us inaccurate dates
			if (fileName === '.picasa.ini') {
				return next();
			}

			getFileDate(eventDir, fileName, eventName, function(fileDate) {
				if (fileDate < eventStart) {
					eventStart = fileDate;
					eventEnd   = eventStart;
				}

				// only set the event end date if it's a file with EXIF
				var fileExt = getFileExt(fileName);
				if (fileExt && fileExt.match(exifTypes)) {
					if (fileDate > eventEnd) {
						eventEnd = fileDate;
					}
				}

				eventInfo[eventDir]['start'] = eventStart;
				eventInfo[eventDir]['end']   = eventEnd;

				return next();
			});
		},
		function done(err) {
			var year  = eventStart.getFullYear();
			var month = eventEnd.getMonth() * 1 + 1;
			    month = (month < 10) ? '0' + month : month;
			var newEventDir = archiveDir + slash + year + slash + month + slash + eventName;

			console.log(eventName + ': ');
			console.log(' -> started ' + eventStart);
			console.log(' -> ended ' + eventEnd);
			console.log(' -> ' + newEventDir);
			//console.log(eventInfo);

			moveFiles(eventName, eventDir, newEventDir);
		}
	);
}

function moveFiles(eventName, eventDir, newEventDir) {
	var files = fs.readdirSync(eventDir);
	eventInfo[eventDir]['files'] = [];

	async.eachLimit(files, 1,
		function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				eventInfo[eventDir]['files'].push(newFilePath);
				//console.log(' -> ' + filePath + ' -> ' + newFilePath);

				if (archiveType == 'move') {
					fs.rename(filePath, newFilePath, function(err) {
						return next();
					});
				}

				if (archiveType == 'copy') {
					child_process.execFile('/bin/cp', ['--no-target-directory', filePath, newFilePath], {}, function(err) {
						if (err) throw err;
						return next();
					});
				}
			});
		}
	);
}

function parseDate(dateString) {
	// 2012:10:30 19:09:16
	var parts = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
	return new Date(parts[1], parts[2]-1, parts[3], parts[4], parts[5], parts[6]);
}

function getFileDate(eventDir, fileName, eventName, callback) {
	var filePath = eventDir + slash + fileName;
	var fileDate = false;
	var fileExt = getFileExt(fileName);

	// always prefer EXIF data as it's most accurate
	if (fileExt && fileExt.match(exifTypes)) {
		new ExifImage({ image: filePath }, function(err, exif) {
			//if (err) throw err;

			//console.log('exif.image.ModifyDate: ' + exif.image.ModifyDate);
			//console.log('exif.exif.CreateDate: ' + exif.exif.CreateDate);
			//console.log('exif.exif.DateTimeOriginal: ' + exif.exif.DateTimeOriginal);

			if (exif && exif.exif && exif.exif.DateTimeOriginal) {
				fileDate = parseDate(exif.exif.DateTimeOriginal);
				//console.log(eventName + '/' + fileName + ' EXIF DATE: ' + fileDate);

				if (typeof callback === 'function') {
					callback(fileDate);
					return;
				}
			}
		});
	} else {
		// fall back to timestamps (unreliable)
		fs.stat(filePath, function(err, stat) {
			fileDate = stat.mtime;
			if (fileDate === false) {
				fileDate = stat.mtime;
			}
			if (fileDate === false) {
				fileDate = stat.mtime;
			}
			//console.log(eventName + '/' + fileName + ' FILE DATE: ' + fileDate);

			if (typeof callback === 'function') {
				callback(fileDate);
				return;
			}
		});
	}
}

function getFileExt(fileName) {
	var x = fileName.match(/\.(\w{3,4})$/);
	if (x && x.length > 0) {
		return x[1];
	}
	return false;
}
