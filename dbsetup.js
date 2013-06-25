var mongoskin = require('mongoskin');
var db        = mongoskin.db('localhost/brush?auto_reconnect');

db.collection('events').ensureIndex(['name', 1]);
db.collection('events').ensureIndex(['start', 1]);
db.collection('events').ensureIndex(['end', 1]);
db.collection('events').ensureIndex(['public', 1]);
