const Member = require('../models').member;
const bcrypt = require('bcrypt');
const loadPage =  require('../../app').loadPage;
const loadError =  require('../../app').loadError;
module.exports = {
  create(req, res) {
    return Member
      .create({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
        type: 'basic'
      })
      .then(out => res.status(201).send(out))
      .catch(error => res.status(400).send(error));
  },
  register(req, res) {
    return Member
      .create({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        type: 'basic'
      }).then(user => {
              req.session.user = user.dataValues;
              res.redirect('/profile');
          })
          .catch(error => {
            console.log(error)
            loadError(req, res, 'Trouble Creating Your Account')
          });
  },
  login(req, res) {
    return Member
      .findOne({ where: { username: req.body.username } })
      .then(function (user) {
        // console.log('USER-?', user)
        if (!user) {
            res.redirect('/login');
        } else if (! bcrypt.compareSync(req.body.pwd, user.password)) {
            res.redirect('/login');
        } else {
            req.session.user = user.dataValues;
            res.redirect('/dashboard');
        }
    })
  },
  logout(req, res) {
    req.session.destroy(function(err) {
      if(err) {
        loadError(req, res, 'Oops... Problem Logging Out')
      } else {
        res.redirect('/');
      }
    });
  },
  list(req, res) {
    return Member
      .all()
      .then(out => res.status(200).send(out))
      .catch(error => res.status(400).send(error));
  },
  accessCheck(req, res, level, next){
    // Levels are public, user, author, admin
    if (level == 'public'){
      return next(req, res);
    }
    else{
      // console.log(req.session)
      user = req.session.user;
      accessType = {
        'user': ['basic', 'author', 'admin'],
        'author': ['author', 'admin'],
        'admin': ['admin', ]
      }
      if (user && user.id){
        Member.findById(user.id)
        .then(member => {
          type = member.type
          if (accessType[level].indexOf(type) >= 0) {
            return next(req, res);
          }
          else loadError(req, res, 'unauthorized access')
        })
      }
      else loadError(req, res, 'unauthorized access')
    }
  },
  update(req, res) {
    return Member
      .find({
          where: {
            id: req.params.MemberId,
            bracketId: req.params.bracketId,
          },
        })
      .then(out => {
        if (!out) {
          return res.status(404).send({
            message: 'Member Not Found',
          });
        }

        return out
          .update(req.body, { fields: Object.keys(req.body) })
          .then(updatedMember => res.status(200).send(updatedMember))
          .catch(error => res.status(400).send(error));
      })
      .catch(error => res.status(400).send(error));
  },
  profile(req, res) {
    return Member.findById(req.session.user.id)
    .then(member => {
      data = {user:member}
      return loadPage(res, req, 'base', {file_id:'profile',  title:member.name + ' Profile', nav:'profile', data:data})
    })
  },
  destroy(req, res) {
    return Member
      .find({
          where: {
            id: req.params.MemberId,
            bracketId: req.params.bracketId,
          },
        })
      .then(out => {
        if (!out) {
          return res.status(404).send({
            message: 'Member Not Found',
          });
        }

        return out
          .destroy()
          .then(() => res.status(200).send({ message: 'Player deleted successfully.' }))
          .catch(error => res.status(400).send(error));
      })
      .catch(error => res.status(400).send(error));
  },
};
