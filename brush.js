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

var imageTypes  = /jpg/i;
var videoTypes  = /(mp4|mov|mts|mpg)/i;

var eventInfo = [];


// find all event directories and process them
fs.readdir(unsortedDir, function(err, events) {
	if (err) throw err;

	// We could look in here and traverse more intelligently:
	//
	// If it's a directory and there are files within it, we could
	// assume it's an Event.
	//
	// If it's a directory and there is another directory within
	// it, we could assume it's an irrelevant directory name (year
	// in our case, but could be 'family pics', etc)
	//
	// Either way, we would only assume it's an Event if it's a
	// directory with nothing but files in it (excluding .picasaoriginals)

	async.eachLimit( events, 3, function iter(eventName, next) {
		var eventDir = unsortedDir + slash + eventName;

		brushEventFiles(eventDir, eventName, function() {
			next();
		});
	});
});




function brushEventFiles(eventDir, eventName, next_event) {
	eventInfo[eventDir] = [];
	var eventStart = new Date();
	var eventEnd   = new Date();
	var files = fs.readdirSync(eventDir);

	// if the event has JPG files, let's skip video files
	// JPG files are 1000x more reliable and accurate
	files.forEach(function(fileName) {
		var fileExt = getFileExt(fileName);
		if (fileExt && fileExt.match(imageTypes)) {
			eventInfo[eventDir]['skip_videos'] = true;
		}
		if (fileExt && fileExt.match(videoTypes)) {
			eventInfo[eventDir]['videos_exist'] = true;
		}
	});

	async.eachLimit(files, 5,
		function iter(fileName, next) {
			var fileExt = getFileExt(fileName);

			getFileDate(eventDir, fileName, function(fileDate) {
				if (fileDate === false || fileName === '.picasa.ini') {
					return next();
				}

				if (fileDate < eventStart) {
					eventStart = fileDate;
					eventEnd   = eventStart;
				}

				// only set the event end date if it's a file with EXIF
				if (fileExt && fileExt.match(imageTypes)) {
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
			//var newEventDir = archiveDir + slash + year + slash + month + slash + eventName;
			var newEventDir = archiveDir + slash + year + slash + eventName;

			console.log(eventName + ' (' + files.length + ' files):');
			console.log(' -> started ' + eventStart);
			console.log(' -> ended   ' + eventEnd);
			if (eventInfo[eventDir]['skip_videos'] && eventInfo[eventDir]['videos_exist']) {
				console.log(' -> (JPG found - skipped video files)');
			}

			fs.stat(newEventDir, function(err, stat) {
				if ( stat && stat.isDirectory() ) {
					console.log(' -> NOT copying (already exists): ' + newEventDir);
					next_event();
				} else {
					moveFiles(eventName, eventDir, newEventDir, function() {
						next_event();
					});
				}
			});

			//console.log(eventInfo);
		}
	);
}

function getFileDate(eventDir, fileName, callback) {
	var filePath = eventDir + slash + fileName;
	var fileExt  = getFileExt(fileName);
	var fileDate = false;

	// JPG files - always prefer EXIF metadata
	if (fileExt && fileExt.match(imageTypes)) {
		getImageExifDate(filePath, function(fileDate) {
			callback(fileDate);
		});
	}

	// Video files - always prefer XMP metadata
	else if (fileExt && fileExt.match(videoTypes)) {
		if (eventInfo[eventDir]['skip_videos']) {
			callback(false);
		} else {
			getVideoExifDate(filePath, function(fileDate) {
				callback(fileDate);
			});
		}
	}

	// File Timestamps - fallback (least accurate)
	else {
		getPhysicalDate(filePath, function(fileDate) {
			callback(fileDate);
		});
	}
}

function moveFiles(eventName, eventDir, newEventDir, callback) {
	console.log(' -> ' + newEventDir);

	var files = fs.readdirSync(eventDir);
	eventInfo[eventDir]['files'] = [];

	async.eachLimit(files, 3,
		function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				if (err) throw err;
				eventInfo[eventDir]['files'].push(newFilePath);
				//console.log(' -> ' + filePath + ' -> ' + newFilePath);

				if (archiveType == 'move') {
					child_process.execFile('/bin/mv', ['-n', filePath, newFilePath], {}, function(err) {
						if (err) throw err;
						return next();
					});
				}

				if (archiveType == 'copy') {
					child_process.execFile('/bin/cp', ['-an', filePath, newFilePath], {}, function(err) {
						if (err) throw err;
						return next();
					});
				}
			});
		},
		function done(err) {
			if (err) throw err;
			callback();
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


function getPhysicalDate(filePath, callback) {
	fs.stat(filePath, function(err, stat) {
		var fileDate = stat.mtime || stat.ctime || stat.atime;
		callback(fileDate);
	});
}

function getImageExifDate(filePath, callback) {
	child_process.execFile(exifTool, ['-j', filePath], {}, function(err, stdout) {
		var stdout   = JSON.parse(stdout.toString());
		var stdout   = stdout[0];
		var fileDate = false;

		if (stdout.DateTimeOriginal) {
			fileDate = parseDate(stdout.DateTimeOriginal);
		}
		else if (stdout.CreateDate) {
			fileDate = parseDate(stdout.CreateDate);
		}
		else if (stdout.ModifyDate) {
			fileDate = parseDate(stdout.ModifyDate);
		}
		else if (stdout.FileModifyDate) {
			fileDate = parseDate(stdout.FileModifyDate);
		}
		// FileInodeChangeDate and FileAccessDate are typically just today

		if (fileDate !== false) {
			callback(fileDate);
		} else {
			getPhysicalDate(filePath, function(fileDate) {
				callback(fileDate);
			});
		}
	});
}

function getVideoExifDate(filePath, callback) {
	child_process.execFile(exifTool, ['-j', filePath], {}, function(err, stdout) {
		var stdout   = JSON.parse(stdout.toString());
		var stdout   = stdout[0];
		var fileDate = false;

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
		// FileInodeChangeDate and FileAccessDate are typically just today

		if (fileDate !== false) {
			callback(fileDate);
		} else {
			getPhysicalDate(filePath, function(fileDate) {
				callback(fileDate);
			});
		}
	});
}
