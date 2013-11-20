var mkdirp    = require('mkdirp');
var async     = require('async');
var fs        = require('fs');
var ExifImage = require('exif').ExifImage;

//var unsortedDir = '/space/Unsorted/Pictures/Picasa'; // no trailing slash
var unsortedDir = '/Users/empurium/code/brush/pics';     // no trailing slash
var archiveDir  = '/Users/empurium/code/brush/archive';  // no trailing slash
var exifTypes   = /jpg/i;
var slash       = '/';        // use '\\' on Windows

var eventRanges = [];

// find all event directories and process them
fs.readdir(unsortedDir, function(err, events) {
	if (err) throw err;

	async.eachLimit( events, 1, function iter(eventName, next) {
		var eventDir = unsortedDir + slash + eventName;
		processEvent(eventDir, eventName);

		next();
	});
});




function processEvent(eventDir, eventName) {
	var eventStart            = new Date();
	var eventEnd              = new Date();
	var eventFiles            = [];
	    eventRanges[eventDir] = [];

	var files = fs.readdirSync(eventDir);

	async.eachLimit(files, 1, function iter(fileName, next) {
		var filePath = eventDir + slash + fileName;

		if (fileName === '.picasa.ini') {
			parsePicasaIni(filePath);
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

				console.log(eventName + ': ' + fileDate + ' -> ' + fileName);

				eventRanges[eventDir]['start'] = eventStart;
				eventRanges[eventDir]['end']   = eventEnd;

				next();
			});
		}
	},
	function done(err) {
		var year  = eventStart.getFullYear();
		var month = eventEnd.getMonth() * 1 + 1;
		    month = (month < 10) ? '0' + month : month;
		var newEventDir = archiveDir + slash + year + slash + month + slash + eventName;
		console.log(eventName + ' -> ' + newEventDir);

		// process each file to figure out this event
		var files = fs.readdirSync(eventDir);
		async.eachLimit(files, 1, function iter(fileName, next) {
			var filePath    = eventDir + slash + fileName;
			var newFilePath = newEventDir + slash + fileName;

			mkdirp(newEventDir, function(err) {
				fs.stat(filePath, function(err, stat) {
					//fs.rename(filePath, newFilePath, function(err) {
						//fs.utimes(newFilePath, stat.atime, stat.mtime, function(err) {
							//console.log(' - ' + filePath + ' -> ' + newFilePath);
							eventFiles.push(newFilePath);
							next();
						//});
					//});
				});
			});
		},
		function done(err) {
			console.log(eventName + ' began: ' + eventStart);
			console.log(eventName + ' ended: ' + eventEnd);
		});
	});
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

			console.log(filePath + ': ');
			//console.log(exif);
			//console.log('exif.image.ModifyDate: ' + exif.image.ModifyDate);
			//console.log('exif.exif.CreateDate: ' + exif.exif.CreateDate);
			//console.log('exif.exif.DateTimeOriginal: ' + exif.exif.DateTimeOriginal);

			if (exif && exif.exif && exif.exif.DateTimeOriginal) {
				fileDate = parseDate(exif.exif.DateTimeOriginal);
				//console.log(fileDate);

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

		if (typeof callback === 'function') {
			callback(fileDate);
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
