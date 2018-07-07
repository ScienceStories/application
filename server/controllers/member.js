const Member = require('../models').member;
const Story = require('../models').story;
const StoryActivity = require('../models').storyactivity;
const bcrypt = require('bcrypt');
const wikidataController = require('./wikidata');
const loadPage =  require('../../app').loadPage;
const loadError =  require('../../app').loadError;
const sequelize = require('../models').sequelize
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
  getActivityList(req, res, listName, filter, data, callback){
    return StoryActivity.findAll(filter)
      .then(activities => {
        // console.log(activities)
        // console.log(listName,'OUTPUT->', activities)
        allList = activities.dataValues
        favoriteList = []
        favQids = []
        for (i = 0; i < activities.length; i++){

            favoriteList.push(activities[i].dataValues)
            favQids.push(activities[i].dataValues.story.qid)

        }
        wikidataController.getDetailsList(req, res, favQids, 'small', function(favList){

          data[listName] = favList
          callback(data)

        })

      })
  },
  profile(req, res) {

    return Member.findById(req.session.user.id)
    .then(member => {
      //find Favorites
      favFilter = {where: {memberId: member.id, favorite: 1},
        order: [
            ['updatedAt', 'DESC'],
        ],
        include: [
          { model: Story, required: true, as:'story'}
        ],}
      topFilter = {where: {memberId: member.id},
        order: [
            ['views', 'DESC'],
        ],
        limit: 10,
        include: [
          { model: Story, required: true, as:'story'}
        ],}
      trendFilter =  {
        group: ['story.id', ],
        attributes: ['story.id', [sequelize.fn('SUM', sequelize.col('views')), 'totalViews']],
          order: [
              [sequelize.fn('SUM', sequelize.col('views')), 'DESC'],
          ],
          limit: 10,
          include: [
            { model: Story, required: true, as:'story'}
          ],}
      data = {user:member}
      module.exports.getActivityList(req, res, 'favorites', favFilter, data, function(favoriteActivity){
        module.exports.getActivityList(req, res, 'mostViews', topFilter, data, function(favoriteActivity){
          module.exports.getActivityList(req, res, 'trending', trendFilter, data, function(favoriteActivity){
            return loadPage(res, req, 'base', {file_id:'profile',  title:member.name + ' Profile', nav:'profile', data:data})
          })
        })

      } )

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
  toggleFavorite(req, res) {
    StoryActivity.findOne({where: {memberId: req.session.user.id, storyId:req.body.storyId}})
      .then(activity => {
        newVal = (activity.favorite) ? 0 : 1
        activity.update({favorite: newVal})
          .then(out => res.send(out))
      })
  },
};
