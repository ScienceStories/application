const membersController = require('../controllers').members;
const storyController = require('../controllers').story;
const wikidataController = require('../controllers').wikidata;
const annotationController = require('../controllers').annotation;
const commentController = require('../controllers').comment;
const sitemapController = require('../controllers').sitemap;
const awsController = require('../controllers').aws;
const fetch = require('node-fetch');
const fs = require('fs');

module.exports = (app, sessionChecker) => {

  // route for Home-Page
  app.get('/', storyController.welcome);
  app.get('/donate', (req, res) => res.renderFullPage('donate', {title:'Giving'}))
  app.get('/home', membersController.homeRedirect)
  app.get('/search', storyController.search)
  app.get('/annotate', (req, res) => res.ifAuthor(annotationController.showPage));
  app.get('/sitemap', sitemapController.generate);
  app.post('/api/comment/send', commentController.send);
  app.get('/api/comment/:comment_id', commentController.renderId);
  app.get('/api/story/validate/:qid', storyController.validate);
  app.get('/api/story/:story_id/commentlist', commentController.renderList);
  app.get('/api/story/:story_id/comments', commentController.storyList);
  // route for Home-Page
  app.get('/Q:id', storyController.select);
  app.get('/preview', storyController.preview);
  app.get('/browse', storyController.browse);
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
  // TODO: Add Functionality for Un-Loagged in to route to login modal
  // route for user signup
  app.get('/signup', sessionChecker, (req, res) => res.redirect('/overview'));
  // route for user Login
  app.get('/login', sessionChecker, (req, res) => res.redirect('/overview'));
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
  app.get('/logout', membersController.logout);
  // route for user profile
  app.get('/profile', (req, res) => res.ifUser(membersController.profile));
  app.get('/overview', (req, res) => res.ifUser(membersController.overview));
  app.get('/feed', (req, res) => res.ifUser(membersController.feed));
  app.get('/account', (req, res) => res.ifUser(membersController.account));
  app.get('/contributions', (req, res) => res.ifUser(membersController.contributions));
  app.get('/member::username', membersController.memberPage);

  app.get('/admin', (req, res) => res.ifAdmin(membersController.admin));
  // route for Uploading pictures
  app.get('/upload', (req, res) => res.ifUser(awsController.upload));
  app.post('/upload', (req, res) => res.ifUser(awsController.saveUpload));
  // route for Building Stories
  app.get('/build', (req, res) => res.ifAuthor(storyController.build));
  // route for Error Page
  app.get('/error', (req, res) => res.renderError(req.query.msg));
  app.get('/api', (req, res) => res.status(200).send({
    message: 'Welcome to the Science Stories API!',
  }));
  // route for sign-up
  app.get('/upload/avatar/:username/:filename', awsController.loadFile);
  app.get('/upload/:username/:filename', awsController.loadFile);

  app.get('/api/iiif/manifest/:filename', awsController.sendManifest);
  app.post('/api/member/register', membersController.register);
  app.post('/api/member/update/:field', membersController.update);
  app.get('/api/member/contribution/:member/:pageNumber', membersController.getContributionGallery);

  // app.post('/api/stories/bulk', (req, res) => {
  //   storyController.bulkCreate(["Q47002916,Q46996541,Q46996509,Q46996484])
  // });

  // route for Home-Page
  app.post('/api/sqarql', wikidataController.customQuery);
  app.post('/api/member/toggleFavorite', membersController.toggleFavorite);
  app.post('/api/member/create', membersController.create);
  app.post('/api/story/create', storyController.create);
  app.post('/api/story/update', storyController.update);
  app.get('/api/story/birthday', storyController.birthday);
  app.get('/api/iiif/manifest-source/:source/:filename', (req, res) => {
    res.status(200).sendfile("manifests/_sources/"+req.params.source+'/'+req.params.filename);
  });
  // app.get('/api/iiif/manifest/:filename', (req, res) => {
  //   var content = JSON.parse(fs.readFileSync("manifests/"+req.params.filename));
  //   res.status(200).send(content);
  // });

  app.post('/api/iiif/save', annotationController.save);
  app.get('/api/iiif/load', annotationController.loadAll);
  app.post('/api/iiif/loadFromUri', annotationController.loadFromUri);
  app.post('/api/iiif/loadFromManifest', annotationController.loadFromManifest);
  app.post('/api/iiif/update', annotationController.update);
  app.get('/api/iiif/:manifest', (req, res) => {
    var content = fs.readFileSync("manifests/"+req.params.manifest+'/index.json');
    res.status(200).send(JSON.parse(content));
  });
  app.get('/api/wd/annotation/:qid', wikidataController.processAnnotation);

  // route for handling 404 requests(unavailable routes)
  app.use(function (req, res, next) {
    res.renderError("404: Sorry can't find this page", 404)
  });

};
