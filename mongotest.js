var mongoskin = require('mongoskin');
var db        = mongoskin.db('localhost/brush?auto_reconnect');

db.collection('events').insert({ sup: 'dude' });
db.collection('events').find().toArray(function(err, events) {
	console.log(events);
});
