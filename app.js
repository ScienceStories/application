/*jslint node: true */
require('dotenv/config');
const express = require('express');
const favicon = require('serve-favicon')
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cons = require('consolidate');
const fs = require('fs');
const hbs = require('handlebars');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
const urlformatter = require('url').format;
const { forceHTTPS } = require('./server/middleware/forceHTTPS');

// Set up the express app
const app = express();
const moment = require('moment');
const url_path = (process.env.NODE_ENV == 'production') ? 'https://sciencestories.io/' : '/'
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.enable('trust proxy');
app.use(forceHTTPS);


// Log requests to the console.
app.use(logger('dev'));

// Setting view engine
app.engine('html', cons.handlebars)
app.set('view engine', 'html')
app.set('views', __dirname + '/views/')
app.use(favicon(path.join(__dirname, '/static/images/icons', 'favicon.ico')))
app.use('/scripts', cors(), express.static(__dirname + '/node_modules/'));
app.use('/build/mirador', cors(), express.static(__dirname + '/static/vendor/mirador/'));
app.use('/api/iiif/manifest/local/',  cors(), express.static(__dirname + '/manifests/'));
app.use('/static', cors(), express.static(__dirname + '/static/'));
app.use(express.static("client/build"));
app.use('/uv-config.json', cors(), (req, res) => res.sendFile(__dirname + '/uv-config.json'));
// TODO: create handlebarsHelpers.js
hbs.registerHelper('if_equal', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this)
    } else {
        return opts.inverse(this)
    }
})
hbs.registerHelper( 'ordinal', function(n) {
  let s=["th","st","nd","rd"],
  v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
});
hbs.registerHelper( 'concat', function() {
  let output = ''
    for (let i=0; i < arguments.length-1; i++){
      output += arguments[i];
    }
    return output;
});
hbs.registerHelper('size', function(obj) {
	if( typeof obj != "object" ) return;
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
});
hbs.registerHelper('no_op', obj => obj);
hbs.registerHelper('trunc_string', (str, len) => str.substring(0, len));

hbs.registerHelper( 'times', function( n, block ) {
    var accum = '',
        i = -1;

    while( ++i < n ) {
        accum += block.fn( i );
    }

    return accum;
});
hbs.registerHelper( 'truncate', function(chars, opts ) {
  // chars MUST be greater than 3
  var string = opts.fn(this).trim().replace(/\s\s+/g, ' ');
  var size = string.length
  if (size <= chars) return string
  return  string.substr(0, chars - 3) + '...'
});
hbs.registerHelper( 'arrayToString', function(array, type='comma') {
    var arraySize = array.length;
    if (arraySize == 0) return ''
    else if (arraySize == 1) return array[0]
    if (type == 'concat') return array.join('');
    var output = ''
    for (var i = 0; i < arraySize; i++) {
      if (type == 'comma') {
        if (i == 0){
          output += array[i]
        }
        else if (i != arraySize - 1) output += ', ' +  array[i]
        else output += ' and ' + array[i]
      }
      if (type == 'pipe'){
        if (i == 0){
          output += array[i]
        }
        else output += ' | ' +  array[i]
      }

    }
    return output
});
hbs.registerHelper( 'contrastColor', function( hex, bw ) {
  if (!hex) return '#000000';
  if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
      throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
      // http://stackoverflow.com/a/3943023/112731
      return (r * 0.299 + g * 0.587 + b * 0.114) > 186
          ? '#000000'
          : '#FFFFFF';
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return "#" + padZero(r) + padZero(g) + padZero(b);
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {

    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});
const USER_ACCESS_MAP = {
  'user': ['basic', 'author', 'admin'],
  'author': ['author', 'admin'],
  'admin': ['admin', ]
}
hbs.registerHelper('ifUserType', function accessCheck(type, level, opts) {
  if (USER_ACCESS_MAP[level].indexOf(type) >= 0) return opts.fn(this);
  else return  opts.inverse(this);
});

hbs.registerHelper('commonsImage', function dateFormat(title) {
  title = title.replace(' ', '%20')
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+title;
    // Going to page:
    // title = title.replace(' ', '_')
    // return `https://commons.wikimedia.org/wiki/File:${title}`;
});
hbs.registerHelper('app_url', function full_url(title) {
    return url_path+title;
});
hbs.registerHelper('itemIcon', function convert_item_fa_class(item) {
    instances = item.claims.P31
    if (instances){

      for (i=0; i < instances.length; i++){
        value = instances[i].mainsnak.datavalue.value.id
        if ( value == 'Q571'){ //Book
          return 'fa fa-book';
        }
        else if (value == 'Q13442814') { //Scholarly Article
          return 'far fa-file-alt';
        }
        else if (value == 'Q10870555') { //Report
          return 'far fa-chart-bar';
        }
      }
    }
    return 'far fa-question-circle';
});
hbs.registerHelper('dateFormat', function dateFormat(date, format, utc) {
    if (format == 'calendar')
      return (utc === true) ?  moment(date).utc().calendar() :moment(date).calendar()
    return (utc === true) ? moment(date).utc().format(format) : moment(date).format(format);
});
hbs.registerHelper('wikidataURL', qid => "https://wikidata.org/wiki/" + qid);
hbs.registerHelper('wikiDateTime', function dateFormat(date, format, utc) {
  date = date.substr(1,)
    return (utc === true) ? moment(date).utc().format(format) : moment(date).format(format);
});

// Register partials
var partials = "./views/partials/";
fs.readdirSync(partials).forEach(function (file) {
    var source = fs.readFileSync(partials + file, "utf8"),
        partial = /(.+)\.html/.exec(file).pop();

    hbs.registerPartial(partial, source);
});

hbs.registerHelper('json', function(data) {
  return JSON.stringify(data)
});
hbs.registerHelper('grouped_each', function(every, context, options) {
    var out = "", subcontext = [], i;
    if (context && context.length > 0) {
        for (i = 0; i < context.length; i++) {
            if (i > 0 && i % every === 0) {
                out += options.fn(subcontext);
                subcontext = [];
            }
            subcontext.push(context[i]);
        }
        out += options.fn(subcontext);
    }
    return out;
});
hbs.registerHelper('chunk_each', function(every, context, options) {
    var chunks = chunkify(context, every, true);
    return chunks.reduce((out, chunk) => out + options.fn({chunks:chunk, count: chunks.length}), "");
});
function chunkify(a, n, balanced) {

    if (n < 2)
        return [a];

    var len = a.length,
            out = [],
            i = 0,
            size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    }

    else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }

    else {

        n--;
        size = Math.floor(len / n);
        if (len % size === 0)
            size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));

    }

    return out;
}


// Parse incoming requests data (https://github.com/expressjs/body-parser)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(cookieParser());
app.use((req, res, next) => {
  req.member = (next) => {
    const user = req.session?.user;
    if (user && user.id){
      // TODO: Invesigate cirular import with appFetch
      const membersController = require('./server/controllers').members;
      return membersController.select(user.id, (member) => {
        req.session.user = member;
        return next(member);
      });
    }
    return next(null);
  };

  res.access = (level, next) => {
    // Levels are user, author, admin
    accessType = {
      'user': ['basic', 'author', 'admin'],
      'author': ['author', 'admin'],
      'admin': ['admin', ]
    }
    return req.member(member => {
      if (member && accessType[level].indexOf(member.type) >= 0){
        return next(req, res, next);
      }
      return res.renderError('unauthorized access')
    });
  };

  res.ifAuthor = (next) => res.access('author', next);
  res.ifUser = (next) => res.access('user', next);
  res.ifAdmin = (next) => res.access('admin', next);

  res.renderPage = (layout, page_name, data) => {
    if (!data.nav) data.nav = page_name;
    if (!data.title) data.title = page_name;
    data.page = () => page_name;
    data.scripts = () => page_name + '_scripts';
    data.links = () => page_name + '_links';
    if (req.session?.user){
      if (data.data == undefined) data.data = {};
      data.data.user = req.session.user;
    }
    return res.render(layout, data);
  };

  res.renderFullPage = (page, data={}) => res.renderPage("full", page, data);

  res.renderError = (msg='Something went wrong.', status=501) =>
    res.status(status).renderPage('base', 'error', {message:msg})

  next();
});

module.exports = {
  // Wrapper for fetch
  // TODO: Move this to utils.js
  appFetch: function (url, options) {
    if (url[0] == '/') url = 'http://sciencestories.io'+url
    return new Promise((resolve, reject) => {
      fetch(url, options)
        .then(res => res.json())
        .then(data => resolve(data))
        .catch(err => reject(err))
    })
  },
  // TODO: Move this to utils.js
  getURLPath(req, path=''){
    return urlformatter({
      protocol: req.protocol,
      host: req.get('host'),
      pathname: path
    });
  }
};

// Require our routes into the application.
require('./server/routes')(app);
// TODO: Create 404 Page HTML
// Setup a default catch-all route that sends back a welcome message in JSON format.
app.get('*', (req, res) => res.status(404).send({
  message: 'Could Not Find Page.',
}));

module.exports = app;
