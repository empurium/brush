var async     = require('async');
var fs        = require('fs');
var ExifImage = require('exif').ExifImage;
var mongoskin = require('mongoskin');

var db        = mongoskin.db('localhost/brush?auto_reconnect');
var Events    = db.collection('events');

// no trailing slash
var allEventsDir = 'Pictures';
var exifTypes    = /jpg/i;
var slashType    = '\\'; // use \ on Windows

fs.readdir(allEventsDir, function(err, events) {
	if (err) throw err;

	async.eachLimit( events, 1, function iter(eventName, next){
		var eventDir = allEventsDir + slashType + eventName;
		processEvent(eventDir, eventName);

		next();
	},
	function done(err){
		console.log('done!');
	});
});


function processEvent(eventDir, eventName) {
	console.log(' -- ' + eventDir);

	var eventStart = new Date();
	var eventEnd   = new Date();

	var files = fs.readdirSync(eventDir);
	async.eachLimit( files, 1, function iter(fileName, next){
		var filePath = eventDir + slashType + fileName;

		if (fileName === '.picasa.ini') {
			parsePicasaIni(filePath);
			next();
		}

		getFileDate(filePath, function (err, fileDate) {
			//console.log(filePath + ' taken ' + fileDate);

			if (fileDate < eventStart) {
				eventStart = fileDate;
				eventEnd   = eventStart;
			}
			if (fileDate > eventEnd) {
				eventEnd = fileDate;
			}

			next();
		});
	},
	function done(err){
		console.log(' -- ' + eventName + ' started: ' + eventStart);
		console.log(' -- ' + eventName + ' ended: ' + eventEnd + "");
		console.log(' -- Done with ' + eventName + '!\n\n');
	});
}

function parsePicasaIni(path) {
	/*
	fs.readFile(path, 'ascii', function(err, data) {
		console.log(data);
	});
	*/
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
