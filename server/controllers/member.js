const Member = require('../models').member;
const bcrypt = require('bcrypt');
module.exports = {
  create(req, res) {
    return Member
      .create({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
      })
      .then(out => res.status(201).send(out))
      .catch(error => res.status(400).send(error));
  },
  signup(req, res) {
    return Member
      .create({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
      }).then(user => {
              req.session.user = user.dataValues;
              res.redirect('/dashboard');
          })
          .catch(error => {
            console.log(error)
              res.redirect('/home');
          });
  },
  login(req, res) {
    return Member
      .findOne({ where: { username: req.body.username } })
      .then(function (user) {
        if (!user) {
            res.redirect('/login');
        } else if (! bcrypt.compareSync(req.body.password, user.password)) {
            res.redirect('/login');
        } else {
            req.session.user = user.dataValues;
            res.redirect('/dashboard');
        }
    })
  },
  list(req, res) {
    return Member
      .all()
      .then(out => res.status(200).send(out))
      .catch(error => res.status(400).send(error));
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
