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
app.post('/api/dump/stories', (req, res) => {
  var str = "Q47002916,Q46996541,Q46996509,Q46996484,Q46996460,Q46996403,Q46996381,Q46996366,Q46996321,Q46996206,Q46996159,Q46996092,Q46992889,Q46992841,Q46847152,Q46845469,Q46842693,Q45094204,Q45093689,Q45089384,Q44840598,Q44839909,Q44824223,Q44704110,Q44396337,Q43659822,Q42721509,Q42658167,Q22018657,Q21531103,Q21524832,Q21513629,Q21508666,Q21055967,Q20738707,Q16010952,Q15430253,Q11190869,Q7562962,Q6780802,Q6779447,Q6766284,Q6153139,Q5701781,Q5566387,Q5400909,Q5085944,Q4384168,Q3746678,Q3246480,Q3112992,Q3061381,Q3051183,Q2960945,Q437943,Q299908,Q1264962,Q4356809,Q4792190,Q4895485,Q451538,Q438850,Q451660,Q510587,Q513677,Q5403091,Q5460808,Q5765094,Q6779153,Q6873339,Q7562962,Q7801989,Q11190869,Q14954659,Q16012695,Q24248264,Q35325874,Q43659822,Q44693230,Q4793623,Q4877232,Q23796609,Q19594759,Q26321,Q16005874,Q49280,Q4384168,Q20829711"
  var array = str.split(',');
  storyController.bulkCreate(array)
});
  // route for Home-Page
  app.post('/api/sqarql', wikidataController.customQuery);

  app.post('/api/member/create', membersController.create);
  app.post('/api/story/create', storyController.create);
  app.get('/api/iiif/manifest-source/:source/:filename', (req, res) => {
    res.status(200).sendfile("manifests/_sources/"+req.params.source+'/'+req.params.filename);
  });
  app.get('/api/iiif/manifest/:filename', (req, res) => {
    var content = JSON.parse(fs.readFileSync("manifests/"+req.params.filename));
    res.status(200).send(content);
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
