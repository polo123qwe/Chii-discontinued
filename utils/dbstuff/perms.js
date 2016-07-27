/**
 * Database for server permissions
 */
var config = require('../../config.json');
var clog = require('../clog.js');
var pg = require('pg');

/* Set up the pool configuration for the DB */
var poolConfig = {
	host		: config.database.db,
	user		: config.database.user,
	password	: config.database.pass,
	database	: config.database.name,
	port		: 5432
}

/* Connect to the pool */
var pool = new pg.Client(poolConfig);

pool.connect(function (err, client, done) {
	if (err) {
		clog.logError("DATABASE", err);
		return;
	}
});

exports.checkPerms = function (msgObject, authorID, roles) {
	return new Promise (function (resolve, reject) {
		if (config.permissions.owner.indexOf(msgObject.author.id) > -1) {
			return resolve(Infinity); /* TO INFINITY AND BEYOND */
		}

		if (msgObject.author.id === msgObject.guild.owner.id) {
			return resolve(4);
		}

		/* Connect to the pool */
		pool.connect(function (err, dbClient, done) {

			if (err) {
				clog.logError("DATABASE", err);
				return;
			}

			dbClient.query('SELECT * FROM permissions WHERE server_id = $1::text', [msgObject.guild.id], function (er, result) {
				if (er) return reject(er);

				if (result.rowCount <= 0) {
					initializePermissions(msgObject.guild);
					return reject('No database entry was found. Initializing server data...');
				} else {
					if (roles) {
						for (var role of roles) {
							for (var i = 0; i < result.rows.length; i++) {
								if (result.rows[i].role_id.indexOf(role.id) > -1) {
									return resolve(result.rows[i].perm_level);
								}
							}
						}
						/* If there isn't a role indexed, we simply assume that the permission level is 0 */
						return resolve(0);
					} else {
						/* If the user has no roles, then they're part of @everyone, hence their permission level is 0 */
						return resolve(0);
					}
				}
			});

		});
	});
}

exports.adjustRoleLevel = function (msgObject, roleID, level) {
	return new Promise (function (resolve, reject) {
		/* Run some checkups on the level before doing the connection */
		if (level < -1 || level > 3 || level == 0) return reject('Level cannot be greater than 3 or lesser than -1, nor 0.');

		pool.connect(function (err, dbClient, done) {
			if (err) {
				clog.logError("DATABASE", err);
				return;
			}

			dbClient.query('SELECT * FROM permissions WHERE server_id = $1::text', [msgObject.guild.id], function (er, result) {
				if (er) { console.log("QUERY 1 SELECT"); return reject(er); }

				if (result.rowCount <= 0) {
					initializePermissions(msgObject.guild);
					return reject('No database entry was found. Initializing server data...');
				} else {
					for (var i = 0; i < result.rows.length; i++) {
						if (result.rows[i].role_id.indexOf(roleID) > -1) {
							dbClient.query('UPDATE permissions WHERE server_id = $1::text AND role_id = $2::text SET perm_level = $3::integer', [msgObject.guild.id, roleID, level], function (erro) {
								if (erro) { console.log("QUERY 2 UPDATE"); return reject(erro); }
								return resolve(level);
							});
						}
					}

					dbClient.query('INSERT INTO permissions (server_id, role_id, perm_level) VALUES ($1::text, $2::text, $3::integer)', [msgObject.guild.id, roleID, level], function (erro) {
						if (erro) { console.log("QUERY 3 INSERT"); return reject(erro); }
						return resolve(level);
					});
				}

			});
		});
	});
}

function initializePermissions (guild) {
	return new Promise (function (resolve, reject) {
		pool.connect(function (err, dbClient, done) {
			if (err) {
				clog.logError("DATABASE", err);
				return;
			}

			dbClient.query('INSERT INTO permissions (server_id, role_id) VALUES ($1::text, $2::text)', [guild.id, "42"], function (er) {
				if (er) { console.log(er); return reject(er); }
				console.log("Server Initialized.");
				return resolve('Ok');
			});
		});
	});
}
