/*jslint node: true */
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cons = require('consolidate');
const fs = require('fs');
const hbs = require('handlebars');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
// Set up the express app
const app = express();
const moment = require('moment');
const url_path = (process.env.NODE_ENV == 'production') ? 'http://sciencestories.io/' : '/'
console.log(url_path)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// Log requests to the console.
app.use(logger('dev'));

// Setting view engine
app.engine('html', cons.handlebars)
app.set('view engine', 'html')
app.set('views', __dirname + '/views')
app.use('/scripts', cors(), express.static(__dirname + '/node_modules/'));
app.use('/build/mirador', cors(), express.static(__dirname + '/static/vendor/mirador/'));
app.use('/manifests',  cors(), express.static(__dirname + '/manifests/'));
app.use('/api/iiif/manifest/',  cors(), express.static(__dirname + '/manifests/'));
app.use('/static', cors(), express.static(__dirname + '/static/'));
app.use('/uv-config.json', cors(), (req, res) => res.sendFile(__dirname + '/uv-config.json'));
hbs.registerHelper('if_equal', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this)
    } else {
        return opts.inverse(this)
    }
})
hbs.registerHelper('commonsImage', function dateFormat(title) {
  title = title.replace(' ', '%20')
    return 'http://commons.wikimedia.org/wiki/Special:FilePath/'+title;
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
      }
    }
    return 'far fa-question-circle';
});
hbs.registerHelper('dateFormat', function dateFormat(date, format, utc) {
    return (utc === true) ? moment(date).utc().format(format) : moment(date).format(format);
});
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
// Register partials
var partials = "./views/slides/";
fs.readdirSync(partials).forEach(function (file) {
    var source = fs.readFileSync(partials + file, "utf8"),
        partial = /(.+)\.html/.exec(file).pop();

    hbs.registerPartial(partial, source);
});

hbs.registerHelper('loadMoment', function(template, data) {
    var loadedPartial = hbs.partials[template];
    if (typeof loadedPartial !== 'function') {
      loadedPartial = hbs.compile(loadedPartial);
    }
    return new hbs.SafeString(loadedPartial(data));
});
hbs.registerHelper('json', function(data) {

    return JSON.stringify(data)
});
// Parse incoming requests data (https://github.com/expressjs/body-parser)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: 'thisIsAFakeSecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));
module.exports = {
  // Wrapper for fetch
  appFetch: function (url) {
    if (url[0] == '/') url = 'http://sciencestories.io'+url
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(res => res.json())
        .then(data => resolve(data))
        .catch(err => reject(err))
    })
  },
  // Helper function to wrapp page load redering
  loadPage: function (res, req, layout, data){
    data.page  = function(){ return data.file_id}
    data.scripts = function(){ return data.file_id+'_scripts'}
    data.links = function(){ return data.file_id+'_links'}
    res.render(layout, data);
  },
  loadError: function (req, res, msg){
    return res.status(401).redirect('/error?msg='+encodeURIComponent(msg))
  }
};

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        // reroute to profile or dashboard
        // res.redirect('/dashboard');
        next();
    } else {
        next();
    }
};

// Require our routes into the application.
require('./server/routes')(app, sessionChecker);

// Setup a default catch-all route that sends back a welcome message in JSON format.
app.get('*', (req, res) => res.status(404).send({
  message: 'Could Not Find Page.',
}));

module.exports = app;
