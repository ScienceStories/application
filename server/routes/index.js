const membersController = require('../controllers').members;
const storyController = require('../controllers').story;
const wikidataController = require('../controllers').wikidata;
const loadPage =  require('../../app').loadPage;
const fetch = require('node-fetch');
const fs = require('fs');
module.exports = (app, sessionChecker) => {

// app.get('/browse', sessionChecker, (req, res) => loadPage(res, req, 'base', {file_id:'browse', nav:'browse'}));
  // route for Home-Page
  app.get('/', sessionChecker, (req, res) => {
      // res.redirect('/login');
      res.render('full', {
        page: function(){ return 'home'},
        scripts: function(){ return 'home_scripts'},
        links: function(){ return 'home_links'},
        title: "Welcome",
        nav: "home",
      });
  });
  // route for Test-Page
  app.get('/test', (req, res) => {
      // res.redirect('/login');
      res.render('base', {
        page: function(){ return 'test'},
        scripts: function(){ return 'test_scripts'},
        links: function(){ return 'test_links'},
        title: "Welcome",
        nav: "test",
      });
  });
  // route for Home-Page
  app.get('/Q:id', wikidataController.loadStory);
app.get('/browse', storyController.browse);
  // route for Home-Page
  app.get('/manifest', sessionChecker, (req, res) => {
      // res.redirect('/login');
      res.render('base', {
        page: function(){ return 'manifest'},
        scripts: function(){ return 'manifest_scripts'},
        links: function(){ return 'manifest_links'},
        title: "Manifest",
        nav: "manifest",
      });
  });
  // route for user signup
  app.route('/signup')
      .get(sessionChecker, (req, res) => {
          res.render('signup');
      })


  // route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
      res.render('login');
    })
app.post('/login', membersController.login)
      // route for user's dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.render('dashboard', {
          user: req.session.user
        });
    } else {
        res.redirect('/login');
    }
});
// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

  app.get('/api', (req, res) => res.status(200).send({
    message: 'Welcome to the Science Stories API!',
  }));
  // route for sign-up
app.post('/api/member/register', membersController.register);
  // route for Home-Page
  app.post('/api/sqarql', wikidataController.customQuery);

  app.post('/api/member/create', membersController.create);
  app.post('/api/story/create', storyController.create);
  app.get('/api/iiif/manifest-source/:source/:filename', (req, res) => {
    res.status(200).sendfile("manifests/_sources/"+req.params.source+'/'+req.params.filename);
  });
  app.get('/api/iiif/:manifest', (req, res) => {
    var content = fs.readFileSync("manifests/"+req.params.manifest+'/index.json');
    res.status(200).send(JSON.parse(content));
  });
  app.get('/api/iiif/:manifest/image/:filename', (req, res) => {
    res.status(200).sendfile("manifests/"+req.params.manifest+'/'+req.params.filename);
  });
  app.get('/api/iiif/:manifest/thumbnail', (req, res) => res.status(200).send({
    message: 'Thumbnail for '+req.params.manifest,
  }));

  app.get('/api/iiif/:manifest/:sequence', (req, res) => {
    var content = JSON.parse(fs.readFileSync("manifests/"+req.params.manifest+'/index.json')).sequences[req.params.sequence];
    res.status(200).send(content);
  });
  app.get('/api/iiif/:manifest/:sequence/:canvas', (req, res) => {
    var content = JSON.parse(fs.readFileSync("manifests/"+req.params.manifest+'/index.json')).sequences[req.params.sequence].canvases[req.params.canvas];
    res.status(200).send(content);
  });
  app.get('/api/iiif/:manifest/image/:filename', (req, res) => {
    // var content = fs.readFileSync("manifests/"+req.params.manifest+'/'+req.params.filename);
    res.status(200).sendfile("manifests/"+req.params.manifest+'/'+req.params.filename);
  });
  app.get('/api/iiif/:manifest/:sequence/:canvas/other/:id', (req, res) => {
    var content = JSON.parse(fs.readFileSync("manifests/"+req.params.manifest+'/index.json')).sequences[req.params.sequence].canvases[req.params.canvas].otherContent[req.params.id];
    res.status(200).send(content);
  });
  app.get('/api/iiif/:manifest/:sequence/:canvas/:image', (req, res) => {
    var content = JSON.parse(fs.readFileSync("manifests/"+req.params.manifest+'/index.json')).sequences[req.params.sequence].canvases[req.params.canvas].images[req.params.image];
    res.status(200).send(content);
  });
  // route for handling 404 requests(unavailable routes)
  app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  });


};
