const storyController = require('../controllers').story;
const wikidataController = require('../controllers').wikidata;
const annotationController = require('../controllers').annotation;
const sitemapController = require('../controllers').sitemap;
const awsController = require('../controllers').aws;
const path = require('path');
const fs = require('fs');

module.exports = (app, sessionChecker) => {
  app.get('/', (req, res)=>  res.redirect('/welcome'));
  app.get('/welcome', storyController.welcome);
  app.get('/donate', (req, res) => res.renderFullPage('donate', {title:'Giving'}))
  app.get('/annotate', (req, res) => res.ifAuthor(annotationController.showPage)); // Optional TODO
  app.get('/sitemap', sitemapController.generate);  // Optional TODO
  app.get('/api/story/dump', storyController.dump);
  // Proxy all other requests to the React front-end app
  app.get('/Q:id', (req, res) => {
    res.sendFile(path.join(__dirname + '/../../client/build/index.html'))
  });
  app.get('/q:id', (req, res) => {
    res.sendFile(path.join(__dirname + '/../../client/build/index.html'))
  });
  app.get('/browse', (req, res) => {
    res.sendFile(path.join(__dirname + '/../../client/build/index.html'))
  })
  app.get('/bibliography', wikidataController.bibliography);
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

  // route for Error Page
  app.get('/error', (req, res) => res.renderError(req.query.msg));
  app.get('/api', (req, res) => res.status(200).send({
    message: 'Welcome to the Science Stories API!',
  }));
  app.get('/api/iiif/manifest/:filename', awsController.sendManifest);
  app.post('/api/storiesAPIInfo', storyController.storiesAPIInfo);
  app.get('/api/iiif/manifest-source/:source/:filename', (req, res) => {
    res.status(200).sendfile("manifests/_sources/"+req.params.source+'/'+req.params.filename);
  });

  app.post('/api/iiif/save', annotationController.save);
  app.get('/api/iiif/load', annotationController.loadAll);
  app.post('/api/iiif/loadFromUri', annotationController.loadFromUri);
  app.post('/api/iiif/loadFromManifest', annotationController.loadFromManifest);
  app.post('/api/iiif/update', annotationController.update);
  app.get('/api/iiif/:manifest', (req, res) => {
    var content = fs.readFileSync("manifests/"+req.params.manifest+'/index.json');
    res.status(200).send(JSON.parse(content));
  });

  // route for handling 404 requests(unavailable routes)
  app.use(function (req, res, next) {
    res.renderError("404: Sorry can't find this page", 404)
  });
};
