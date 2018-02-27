const membersController = require('../controllers').members;
const fetch = require('node-fetch')
module.exports = (app, sessionChecker) => {
  // Wrapper function to fetch
  function _api(url) {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(res => res.json())
        .then(data => resolve(data))
        .catch(err => reject(err))
    })
  }


  // route for Home-Page
  app.get('/', sessionChecker, (req, res) => {
      // res.redirect('/login');
      res.render('base', {
        page: function(){ return 'home'},
        scripts: function(){ return 'home_scripts'},
        links: function(){ return 'home_links'},
        title: "Welcome",
      });
  });
  // route for user signup
  app.route('/signup')
      .get(sessionChecker, (req, res) => {
          res.render('signup');
      })
app.post('/signup', membersController.signup);

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

  app.post('/api/members', membersController.create);


  // route for handling 404 requests(unavailable routes)
  app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  });


};
