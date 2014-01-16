var mkdirp        = require('mkdirp');
var async         = require('async');
var fs            = require('fs');
var child_process = require('child_process');

//
// CONFIGURATION
//
var unsortedDir = '/space/Unsorted/Pictures/Picasa';   // no trailing slash
var archiveDir  = '/space/Unsorted/Pictures/Archive';  // no trailing slash
var archiveType = 'copy';     // copy, move, or test
var slash       = '/';        // use '\\' on Windows

// DEV TESTING
//var unsortedDir = 'Pictures';
//var archiveDir  = 'Archive';

// exiftool is available at:
// http://www.sno.phy.queensu.ca/~phil/exiftool/
var exifTool    = '/usr/local/bin/exiftool';           // path to exiftool binary

var exifTypes   = /jpg/i;
var xmpTypes    = /(mp4|mov|mts|mpg)/i;

var eventInfo = [];

// find all event directories and process them
fs.readdir(unsortedDir, function(err, events) {
	if (err) throw err;

	async.eachLimit( events, 1, function iter(eventName, next) {
		var eventDir = unsortedDir + slash + eventName;

		getEventDateRange(eventDir, eventName, function() {
			next();
		});
	});
});




function getEventDateRange(eventDir, eventName, next_event) {
	eventInfo[eventDir] = [];

	var eventStart = new Date();
	var eventEnd   = new Date();

	var files = fs.readdirSync(eventDir);
	console.log(eventName + ' (' + files.length + ' files):');

	async.eachLimit(files, 1,
		function iter(fileName, next) {
			getFileDate(eventDir, fileName, function(fileDate) {
				if (fileDate === false || fileName === '.picasa.ini') {
					return next();
				}

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

			console.log(' -> started ' + eventStart);
			console.log(' -> ended ' + eventEnd);
			//console.log(eventInfo);

			moveFiles(eventName, eventDir, newEventDir);
			next_event();
		}
	);
}

function getFileDate(eventDir, fileName, callback) {
	var filePath = eventDir + slash + fileName;
	var fileExt  = getFileExt(fileName);
	var fileDate = false;

	// JPG files - always prefer EXIF metadata
	if (fileExt && fileExt.match(exifTypes)) {
		child_process.execFile(exifTool, ['-j', filePath], {}, function(err, stdout) {
			var stdout = JSON.parse(stdout.toString());
			var stdout = stdout[0];

			if (stdout.DateTimeOriginal) {
				fileDate = parseDate(stdout.DateTimeOriginal);
			}
			else if (stdout.CreateDate) {
				fileDate = parseDate(stdout.CreateDate);
			}
			else if (stdout.ModifyDate) {
				fileDate = parseDate(stdout.ModifyDate);
			}
			else if (stdout.FileInodeChangeDate) {
				fileDate = parseDate(stdout.FileInodeChangeDate);
			}
			else if (stdout.FileAccessDate) {
				fileDate = parseDate(stdout.FileAccessDate);
			}
			else if (stdout.FileModifyDate) {
				fileDate = parseDate(stdout.FileModifyDate);
			}

			callback(fileDate);
		});
	}

	// Video files - always prefer XMP metadata
	else if (fileExt && fileExt.match(xmpTypes)) {
		child_process.execFile(exifTool, ['-j', filePath], {}, function(err, stdout) {
			var stdout = JSON.parse(stdout.toString());
			var stdout = stdout[0];

			if (stdout.TrackCreateDate) {
				fileDate = parseDate(stdout.TrackCreateDate);
			}
			else if (stdout.TrackModifyDate) {
				fileDate = parseDate(stdout.TrackModifyDate);
			}
			else if (stdout.MediaCreateDate) {
				fileDate = parseDate(stdout.MediaCreateDate);
			}
			else if (stdout.MediaModifyDate) {
				fileDate = parseDate(stdout.MediaModifyDate);
			}
			else if (stdout.ModifyDate) {
				fileDate = parseDate(stdout.ModifyDate);
			}

			callback(fileDate);
		});
	}

	// File Timestamps - fallback (least accurate)
	else {
		fs.stat(filePath, function(err, stat) {
			fileDate = stat.mtime;
			if (fileDate === false) {
				fileDate = stat.ctime;
			}
			if (fileDate === false) {
				fileDate = stat.atime;
			}

			callback(fileDate);
			return;
		});
	}
}

function moveFiles(eventName, eventDir, newEventDir) {
	console.log(' -> ' + newEventDir);

	var files = fs.readdirSync(eventDir);
	eventInfo[eventDir]['files'] = [];

	async.eachLimit(files, 1,
		function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				if (err) throw err;
				eventInfo[eventDir]['files'].push(newFilePath);
				//console.log(' -> ' + filePath + ' -> ' + newFilePath);

				if (archiveType == 'move') {
					fs.rename(filePath, newFilePath, function(err) {
						return next();
					});
				}

				if (archiveType == 'copy') {
					child_process.execFile('/bin/cp', ['-a', filePath, newFilePath], {}, function(err) {
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

function getFileExt(fileName) {
	var x = fileName.match(/\.(\w{3,4})$/);
	if (x && x.length > 0) {
		return x[1];
	}
	return false;
}
