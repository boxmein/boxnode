exports.type = 'command';
exports.listAll = function() { return ['*'] };
exports.getHelp = function() {
  return { '*': '`hello <name>` - greets <name>' };
};

function sanitize(line) {
  return line
          .slice(0, 150)
          .split('')
          .map(function(each) {
            var charcode = each.charCodeAt(0);

            if (charcode > 31 &&
                charcode !== 127)
              return each;

            return undefined;
          })
          .filter(function(each) {
            return each != undefined;
          })
          .join('');
}

exports.listener = function(line, words, respond) {
  return respond('Hello ' + sanitize(words.slice(1).join(' ')));
};

exports.init = function(util, alias) {};
