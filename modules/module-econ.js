/* Gotta love underscore */
var _ = require('underscore');
var logger;
var Q = require('q');
var sqlite3 = require('sqlite3').verbose();
var db;

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    'cash': '`econ.cash` - tells you how much money you have right now',
    'inv':  '`econ.inv` - tells you what items are owned by you',
    'addme': '`econ.addme` - adds you to the economy (run this to create your hostname-based user!)',
    'god': '`econ.god <cmd> <args...>` - lets you do godly stuff to the economy. subcommands right now: (sql, close)'
  };
};

exports.listener = function(line, words, respond, util) {
  var cmd = this.event.slice(5);
  logger.debug("received subcommand: " + cmd);
  if (commands.hasOwnProperty(cmd) && typeof commands[cmd] == 'function') {
    commands[cmd](line, words, respond, util);
  }
};

// Utility functions

// these three are Q.nbind(db.run, db) and so on respectively. Set in `init`.
var db_run;
var db_get;
var db_all;

/**
 * Generates a function that's perfect as a responder for database errors.
 * Can be used in a Deferred#catch() call. 
 * @param target {String} a shortname for "Database error in target"
 * @returns {Function} a logging function that yells for database errors
 */
function genericDBError(target) {
  return function(err) {
    logger.error("Database error in " + target + ": " + err);
    logger.verbose(err.stack);
  };
}

/**
 * Adds a user with some preset money to the user database.
 * Checks if the user exists first, and if it does, the promise rejects.
 * @param hostname {String} the hostname eg "unaffiliated/X" of the desired user
 * @param money {Integer} an amount of money you want to add by default 
 * @returns {Promise} a promise that resolves if the user addition succeeded, 
            rejects otherwise
 */
function addUser(hostname, money) {
  // check if the user exists first
  return getUserID(hostname)
  .catch(genericDBError("addUser"))
  .then(function(userid) {
    if (userid) {
      throw new Error("USER_EXISTS");
    }
    return db_run('INSERT INTO users (user_hostname, money) VALUES (?, ?)', 
         [hostname, money]).catch(genericDBError("addUser"))
  });
}

/**
 * Returns the User ID (integer) of an user by their hostname. 
 * @param hostname {String} the hostname eg "unaffiliated/X" of the user
 * @returns {Promise} a promise that fulfills to the user ID as an integer
 */
function getUserID(hostname) {
  return db_get('SELECT user_id FROM users WHERE user_hostname = ?', [hostname])
    .catch(genericDBError("getUserID"))
    .then(function(row) {
      if (!row) 
        logger.verbose("while getting user id: user " + hostname + " not found");
      return (row ? row.user_id : undefined);
    });
}

/**
 * Sets the money on a target host by their hostname.
 * Checks that the user exists. Checks that the amount is a positive integer.
 * @param targetHost {String} the hostname of the user
 * @param amount {Number} the amount you want the money to be
 * @returns {Promise} that resolves to true when the money has been set
 * @throws rejects with "NON_NUMERICAL_AMOUNT" if amount can't be parsed to int
 * @throws rejects with "AMOUNT_LTE_ZERO" if amount is less than or equal to 0
 * @throws rejects with "USER_NOT_EXIST" if the target user doesn't exist
 */
function setMoney(targetHost, amount) {
  
  amount = parseInt(amount, 10); 
  if (isNaN(amount)) return Q.reject("NON_NUMERICAL_AMOUNT");
  if (amount <= 0) return Q.reject("AMOUNT_LTE_ZERO");

  return getUserID(targetHost)
  .catch(genericDBError("setMoney"))
  .then(function(target_userid) {
    if (target_userid) {
      return db_get('UPDATE users SET money = $transferAmt WHERE user_id = $userId', {
        $transferAmt: amount,
        $userId: target_userid
      })
      .catch(genericDBError("setMoney"));
    } else {
      throw new Error("USER_NOT_EXIST");
    }
  });
}

/**
 * Returns the amount of money on a target user by hostname.
 * @param targetHost {String} the hostname of the user
 * @returns {Promise} promise that resolves to the amount of money as integer
 * @throws rejects with "USER_NOT_EXIST" if the target user doesn't exist
 */
function getMoney(targetHost) {
  return getUserID(targetHost)
  .catch(genericDBError("getMoney"))
  .then(function(userid) {
    return db_get("SELECT money FROM users WHERE user_id = ?", [userid])
    .catch(genericDBError("getMoney"))
    .then(function(row) { 
      if (!row) 
        throw new Error("USER_NOT_EXIST"); 
      return row.money; 
    });
  })
}

/**
 * Transfers an amount of money from sourceHost to targetHost. 
 * Checks sourceHost and targetHost for existing.
 * Checks amount for a valid value, and for sourceHost to have enough.
 * @param sourceHost {String} the source user's hostname
 * @param targetHost {String} the target user's hostname
 * @param amount {Number} the amount of money to be moved from sourceHost to 
                 targetHost
 * @returns {Promise} promise that resolves when money is successfully moved
 * @throws rejects with "NON_NUMERICAL_AMOUNT" if amount can't be parsed to int
 * @throws rejects with "AMOUNT_LTE_ZERO" if amount is less than or equal to 0
 * @throws rejects with "TARGET_NOT_FOUND" if the target user doesn't exist
 * @throws rejects with "SOURCE_NOT_FOUND" if the source user doesn't exist
 * @throws rejects with "NOT_ENOUGH_MONEY" if the source doesn't have enough
 */
function transferMoney(sourceHost, targetHost, amount) {
  logger.verbose("transferMoney: checking amount for validity");
  // 1. is the amount of money valid?
  amount = parseInt(amount, 10);

  var def = Q.defer();
  
  if (isNaN(amount)) {
    logger.info('transferMoney failed because of a non-numerical amount');
    return def.reject('NON_NUMERICAL_AMOUNT');
  }

  if (amount <= 0) {
    logger.info('transferMoney failed because of a zero or lower amount');
    return def.reject('AMOUNT_LTE_ZERO');
  }

  // check sourceHost for existence
  logger.verbose("amount OK, is sourceHost existing in the economy?");
  db_get('SELECT user_id, money FROM users WHERE user_hostname = ?', [sourceHost])
  .catch(genericDBError("transferMoney"))
  .then(function(source_user_row) {

    if (source_user_row !== undefined) {
      
      // check target host for existence
      logger.verbose("source host exists, checking target host for existence");
      db_get('SELECT user_id, money FROM users WHERE user_hostname = ?', [targetHost])
      .catch(genericDBError("transferMoney"))
      .then(function(target_user_row) {
  
        if (target_user_row !== undefined) {
          
          // check that the source has enough money to perform the transfer
          if (source_user_row.money - amount >= 0) {
            db.serialize(function() {
      
              // if so, begin transferring
              Q.all([
                db_run('UPDATE users SET money = money + $transferAmt WHERE user_id = $userId', {
                  $userId: target_user_row.user_id,
                  $transferAmt: amount
                }),
                db_run('UPDATE users SET money = money - $transferAmt WHERE user_id = $userId', {
                  $userId: source_user_row.user_id,
                  $transferAmt: amount
                })
              ])
              .catch(genericDBError("transferMoney"))
              .then(def.resolve);
      
            }); // end serialize
          } else {
            def.reject("NOT_ENOUGH_MONEY");
          }
        } else {
          def.reject("TARGET_NOT_FOUND");
        }
      });
    } else {
      def.reject("SOURCE_NOT_FOUND");
    }
  });
  
  return def.promise;
}

var commands = {};


/** 
 * How much money do I have?
 * 
 */
commands.cash = function(line, words, respond, util) {
  db_get('SELECT money FROM users WHERE user_hostname = ?', [line.hostname])
  .catch(genericDBError("cash"))
  .then(function(row) {
    if (!row) {
      logger.verbose("while fetching cash: user not not found: " + line.hostname);
      respond("You aren't in the economy yet!"); 
      return;
    }
    var money = row.money;
    logger.verbose("fetching cash: user " + line.hostname + " has " + money);
    respond("You have this much money: " + money);
  });
};

/** 
 * What is in my inventory?
 * 
 */
commands.inv = function(line, words, respond, util) {
  getUserID(line.hostname)
  .catch(genericDBError("inv"))
  .then(function(uid) {
    if (!uid) {
      logger.verbose("listing inventory: did not find user " + line.hostname);
      return;
    } 

    logger.verbose("fetching inventory. going to list all items owned by user");

    db_all(commands.INV_QUERY, [uid])
    .catch(genericDBError("inv"))
    .then(function(rows) {
      logger.verbose('listing inventory: query done, now outputting');
      var return_msgs = [];

      for (var i = 0; i < rows.length; i++) {
        var name  = rows[i].item_name;
        var count = rows[i]['COUNT(items_existing.item_id)'];
        return_msgs.push(count + " " + name + (count === 1 ? '' : 's'));
      }
      respond("You have: " + return_msgs.join(', '));
    });
  });
};

commands.INV_QUERY = "SELECT store.item_name, COUNT(items_existing.item_id) " +
                     " FROM items_existing " +
                       " INNER JOIN store " + 
                       " WHERE store.item_id = items_existing.item_id AND " +
                       " items_existing.owner_id = ? " +
                     " GROUP BY items_existing.item_id";

/** 
 * Can I be in the economy?
 * 
 */
commands.addme = function(line, words, respond, util) {
  // 1. check that the user is not already in the economy
  var hostname = line.hostname;
  var money = util.config.get('modules.econ.base_money', 100);
  getUserID(line.hostname)
  .catch(genericDBError("addme"))
  .then(function(empty) {
    if (empty === undefined) {
      db.serialize(function() {
        // 2. fine, create its users table entry
        db_run('INSERT INTO users (user_hostname, money) VALUES (?, ?)', [hostname, money])
        .catch(genericDBError("addme"))
        .then(function(err, ok) {
          if (err) {
            logger.error("database error in addme getUserID: " + err);
            logger.verbose(err.stack);
            return;
          }
          respond("you are now in the economy!");
        });

        // 3. do we add other things?
      });
    }
  });
};

/** 
 * Can I give someone some of my money?
 * 
 */
commands.give = function(line, words, respond, util) {
  var targetUser = words[1];
  var transferAmount = words[2];
  // ¯\_(ツ)_/¯ 
  transferMoney(line.hostname, targetUser, transferAmount)
  .done(function(yay) {
    respond("gave money!");
  }, function(nay) {
    if (nay == "NOT_ENOUGH_MONEY") {
      respond("you don't have enough money!");
    } else if (nay == "TARGET_NOT_FOUND") {
      respond("your target doesn't exist! try a hostname, or poke boxmein to add nickname resolution");
    } else if (nay == "SOURCE_NOT_FOUND") {
      respond("go add yourself to the economy! try `econ.addme`!");
    } else if (nay == 'NON_NUMERICAL_AMOUNT') {
      respond("try a number as the amount! see `help econ.give` for details!");
    } else if (nay == 'AMOUNT_LTE_ZERO') {
      respond("try a number bigger than 0! :D");
    }
  });
};


/** 
 * Can I fuck around with the economy?
 * 
 */
commands.god  = function(line, words, respond, util) {
  if (!util.matchesHostname(util.config.get('owner'), line.hostmask)) {
    respond("You can't do this!");
  }


  if (words[1] == 'sql') {
    var statement = words.slice(2).join(' ');
    logger.info("god: executing the following sql statement:");
    logger.info(statement);

    db_all(statement)
    .catch(genericDBError("god sql"))
    .catch(function(err) { respond("database error!"); })
    .then(function(rows) {
      logger.info("god: sql statement returned " + rows.length + " rows");
      if (rows.length === 0) {
        respond("statement succeeded! empty response");
      }
      if (rows.length <= 3) {
        respond(rows.map(JSON.stringify.bind(JSON)).join('|'));
      } else {
        respond("statement succeeded, returned " + rows.length + " rows");
      }
    });
  } 

  else if (words[1] == 'close') {
    logger.info("god: closing database connection. all future db statements will fail");
    db.close();
    respond("closed the database connection! all future db statements will probably fail");
  } 


  else if (words[1] == 'adduser') {
    logger.info("god: adding a user to the economy.");
    var hostname = words[2];
    var money = words[3];

    addUser(hostname, money)
    .catch(function(err) { respond("database error!"); })
    .done(function() {
      respond("added a new user to the economy!");
    });
  } 


  else if (words[1] == 'setmoney') {
    var hostname = words[2];
    
    var money = words[3];
    money = parseInt(money, 10);
    
    if (isNaN(money)) {
      logger.warning("god: money must be a number!");
      respond("money must be a number!"); 
      return;
    }

    db_run('UPDATE users SET money = ? WHERE user_hostname = ?', [money, hostname])
    .catch(genericDBError("god setmoney"))
    .done(function() {
      respond("set the user's money to " + money);
    });
  }

  else if (words[1] == 'getmoney') {
    var hostname = words[2];
    db.run('SELECT money FROM user WHERE user_hostname = ?', [hostname], function(err, row) {
      if (err) {
        logger.error('db error while ' + err);
        logger.verbose(err.stack);
        return;
      }
      if (row) {
        var money = row.money;
        respond("the user has " + money);
      } else {
        respond("the user doesn't exist!");
      }
    });
  }
};

exports.init = function(util, addAlias) {

  // Here we setup the logger. We name the logger something we want, this is 
  // prefixed to all log messages by this logger. The log levels can let you 
  // filter out log types, and here's the types supported by default:
  // 'VERBOSE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'
  // Just call the lowercase version on the logger object to send that log. All
  // the functions are variadic and will concat arguments with a space.
  // ie, logger.verbose("hello", "world", 5, {}) is valid!
  
  logger = new require('toplog')({
    concern: 'econ',
    loglevel: util.config.get('modules.econ.loglevel', util.config.get('loglevel', 'INFO'))
  });

  db = new sqlite3.Database('economy.db');
  db_run = Q.nbind(db.run, db);
  db_get = Q.nbind(db.get, db);
  db_all = Q.nbind(db.all, db);
  // Set that DB up with:

  /*
  CREATE TABLE "items_existing" (
    `item_id` INTEGER NOT NULL,
    `owner_id`  INTEGER NOT NULL,
    `item_data` TEXT DEFAULT '{}',
    `existing_item_id`  INTEGER,
    PRIMARY KEY(existing_item_id),
    FOREIGN KEY(`item_id`) REFERENCES store ( item_id ),
    FOREIGN KEY(`owner_id`) REFERENCES users ( user_id )
  );
  */
  db_get("SELECT COUNT(*) FROM items_existing")
  .catch(genericDBError("init#itemCount"))
  .then(function(row) {
    logger.info('starting economy with ' + row['COUNT(*)'] + ' existing items');
  });
  
  /*
  CREATE TABLE "users" (
    `user_id` INTEGER,
    `user_hostname` TEXT NOT NULL UNIQUE,
    `money` INTEGER NOT NULL,
    PRIMARY KEY(user_id)
  );  
  */
  db_get("SELECT COUNT(*) FROM users")
  .catch(genericDBError("init#userCount"))
  .then(function(row) {
    logger.info('starting economy with ' + row['COUNT(*)'] + ' existing users');
  });
  

  /*
  CREATE TABLE "store" (
    `item_id` INTEGER, 
    `item_name` TEXT UNIQUE NOT NULL, 
    `item_price` INTEGER NOT NULL, 
    `item_description` TEXT,
    PRIMARY KEY(item_id)
  );

  */
  db_get("SELECT COUNT(*) FROM store")
  .catch(genericDBError("init#storeCount"))
  .then(function(row) {
    logger.info('starting economy with ' + row['COUNT(*)'] + ' item types');
  });
  
};
