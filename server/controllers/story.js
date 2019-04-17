const fs = require('fs');
const Story = require('../models').story;
const Member = require('../models').member;
const LogStory = require('../models').logstory;
const wdk = require('wikidata-sdk');
const appFetch =  require('../../app').appFetch;
const sparqlController = require('./sparql');
const wikidataController = require('./wikidata');
const sequelize = require('../models').sequelize;
const featuredStories =  JSON.parse(fs.readFileSync("server/controllers/featuredStories.json"));
const _ = module.exports = {
  create(req, res) {
    qid = 'Q' + req.body.qid
    if (req.body.key != 'ssyale'){
      return req.status(404).send('Wrong Key')
    }
    return Story
      .create({
        qid: qid,
        status: 'basic',
        data: {}
      })
      .then(out => res.status(201).redirect('/'+qid))
      .catch(error => res.status(400).send(error));
  },
  select(req, res) {
    return Story
      .find({
          where: {
            qid: 'Q'+req.params.id,
            status: 'basic'
          },
        })
      .then(out => {
        if (!out) {
          return res.renderError('This story has not yet been curated.');
        }
        return _.getContributors(out.id, function(contributors){
          out.contributors = contributors
          return wikidataController.processStory(req, res, out);
        })
      })
      .catch(error => res.renderError('Trouble Loading this Story'));
  },
  welcome(req, res){
    return _.getCount(count => {
      return _._getBirthdays((birthdays) => {
        let pageData = {
          title: 'Welcome',
          story_count: count,
          meta: {description: "Science Stories brings scientific work into social spaces where users discover information about underrepresented pioneers — creating starting points for further exploration. For institutions with cultural heritage resources in libraries, archives, museums and galleries that are not yet available on the web, we provide a web application that leverages Wikidata, IIIF, and semantic web technologies to demonstrate a vision of what getting scientific work products into social spaces can do."},
          featured_stories: _.getFeaturedList(),
          birthdays: birthdays
        }
        return res.renderFullPage('home', pageData);
      });
    });
  },
  validate(req, res){
    let qid = req.params.qid;
    return _.getByQID(qid, story => {
      if (story) return res.send({valid: true, active: true});
      return wikidataController.storyValidate(qid, isValid => {
        return res.send({valid:isValid, active:false});
      });
    });
  },
  getByQID(qid, next){
    return Story.findOne({where: {qid:qid}}).then(next);
  },
  getCount(callback){
    return Story.count().then(count => callback(count))
  },
  getContributors(id, callback){
    var filter = {where: {storyId: id}, attributes: ['memberId'], order: [
        ['updatedAt', 'DESC'],
    ],
    include: [
      { model: Member, required: true, as:'member',
      attributes: ['username', 'name', 'image']
    }
    ],}
    return LogStory.findAll(filter).then(contributorData => {
      var contribs = []
      var contribsMap = {}
      for (var i = 0; i < contributorData.length; i++) {
        var tempItem = contributorData[i].dataValues.memberId
        if(!contribsMap[tempItem]){
          contribs.push(contributorData[i])
          contribsMap[tempItem] = true
        }
      }
      return callback(contribs)
    })
  },
  build(req, res){
    let pageData = {title:'Story Creation'};
    if (req.query.qid){
      return Story.findOne({where: {qid:req.query.qid}}).then(story => {
        pageData.data = {moments:story.data};
        pageData.idVal = req.query.qid.substr(1);
        return res.renderPage('base', 'build', pageData);
      })
    }
    return res.renderPage('base', 'build', pageData);
  },
  preview(req, res) {
    req.params.id = req.query.id;
    let data = JSON.parse(req.query.data);
    return wikidataController.processStory(req, res, {data: data});
  },
  searchFunction(string, tokens){
    var tokenTotal = tokens.length
    var searchScore = 0
    for (var i = 0; i < tokenTotal; i++) {
      if (string.indexOf(tokens[i]) > -1) searchScore++;
    }
    if ( searchScore/tokenTotal < .75) return false
    return true
  },
  search(req, res) {
    let searchString = req.query.search.toLowerCase().trim();
    if (!searchString.length) return res.renderError('No Search Detected');
    let searchTokens = searchString.split(" ");
    return wikidataController.searchItems(req, res, searchString, results => {
      return Story.findAll({where: {qid:results}}).then(stories => {
        let resultQids = [];
        for (i=0;i < stories.length; i++){
          resultQids.push(stories[i].dataValues.qid);
        }
        let data = {};
        return Story.findAll().then(allStories => {
            let allIds = [];
            for (i=0;i < allStories.length; i++){
              allIds.push(allStories[i].dataValues.qid);
            }
            wikidataController.getDetailsList(req, res, resultQids, 'small', 'first', false, function(detailList){
              wikidataController.getDetailsList(req, res, allIds, 'small', 'first', false,  function(alldetailList){
                for(var i = 0; i < detailList.length; i++){
                  for(var key in stories[i].dataValues) detailList[i][key] =stories[i].dataValues[key];
                }
                for(var i = 0; i < alldetailList.length; i++){
                  var objectStr = alldetailList[i].itemLabel + alldetailList[i].itemDescription;
                  objectStr = JSON.stringify(alldetailList[i]) + JSON.stringify(allStories[i].dataValues)
                  objectStr = objectStr.toLowerCase()
                  if  (_.searchFunction(objectStr, searchTokens) && (resultQids.indexOf(alldetailList[i].qid) == -1) ){
                    var newItem = alldetailList[i]
                    for(var key in allStories[i].dataValues) newItem[key] = allStories[i].dataValues[key];
                    detailList.push(newItem)
                  }
              }
              data.results = detailList;
              data.story_total = detailList.length
              return Member.findAll({attributes: { exclude: ['password', 'createdAt', 'updatedAt'] }}).then(members => {
                let member_total = 0
                for (let i = 0; i < members.length; i++) {
                  let m = members[i].dataValues;
                  let memStr = JSON.stringify(m).toLowerCase();
                  if (_.searchFunction(memStr, searchTokens)) {
                    detailList.push({
                      qid: 'member:' + m.username,
                      image: m.image,
                      itemLabel: "Member: " + m.name,
                      itemDescription: m.bio
                    });
                    member_total++;
                  }
                }
                data.member_total = member_total;
                let pageData = {title:'Search '+req.query.search, data:data};
                return res.renderPage('base', 'search', pageData)
              });
            });
          });
        });
      });
    })
  },
  browse(req, res) {
    page = (req.query.page) ? parseInt(req.query.page, 10) : 1
    stories_per_page = 50
    return _.getGallery(req, res, false, page, stories_per_page)
  },
  birthday(req, res){
    return _._getBirthdays((items) => res.send(items))
  },
  _getBirthdays(callback){
    Story.findAll({ attributes:['qid', 'data']}).then(list => {
      let qidList = [];
      let allStories = [];
      for(let i in list){
        qidList.push(list[i].dataValues.qid);
        allStories.push(list[i].dataValues);
      }
      return sparqlController.birthdayQuery(qidList, content => {
        content = _.imagesFromStory(allStories, content);
        return callback(content);
      })
    })
  },
  imagesFromStory(db_values, output){
    for (var i = 0; i < output.length; i++) {
      if(!output[i].image){
        let index = output[i].index;
        for (var k = 0; k < db_values[index].data.length; k++) {
          if (db_values[index].data[k].image){
            output[i].image = db_values[index].data[k].image;
            break;
          }
        }
      }
    }
    return output;
  },
  getGallery(req, res, members, pageNumber, stories_per_page, callback){
    offset = (pageNumber-1)*stories_per_page;
    return Story.count().then(total_stories => {
      let query = {
        attributes:['qid', 'data'],
        order: [['updatedAt', 'DESC']],
        offset: offset,
        limit: stories_per_page
      };
      Story.findAll(query).then(out => {
        story_total = out.length;
        qidList = [];
        for(var i = 0; i < story_total; i++){
          qidList.push(out[i].dataValues.qid);
        }
        return wikidataController.getDetailsList(req, res, qidList, 'small_with_age', 'first', false, qidList => {
          for (let i = 0; i < qidList.length; i++) {
            if(!qidList[i].image){
              for (let k = 0; k < out[i].dataValues.data.length; k++) {
                if (out[i].dataValues.data[k].image){
                  qidList[i].image = out[i].dataValues.data[k].image;
                  break;
                }
              }
            }
          }
          let maxPage = Math.ceil(total_stories/stories_per_page) + 1;
          let pageData = {
            title: `Browse Stories (Page ${pageNumber})`,
            data: {
              browseList: qidList,
              totalStories: total_stories,
              page: pageNumber,
              maxPage: maxPage,
              prevPage:(pageNumber == 1) ? 0 : pageNumber - 1,
              nextPage: (pageNumber == maxPage) ? 0 : pageNumber + 1
            }
          }
          return res.renderPage('base', 'browse', pageData);
        });
      });
    });
  },
  update(req, res) {
    user_id = (req.session.user) ? req.session.user.id : false;
    if (!user_id) return res.send('Session Has Expired')
    else return Story
      .findOrCreate({
          where: {
            qid: req.body.qid,

          },
         defaults: {status: 'basic'}
        })
      .spread((found, created) =>{
        found.update({data: JSON.parse(req.body.data)})
          .then(output => {
            LogStory.create({memberId:user_id, storyId:output.id, data:JSON.parse(req.body.data)})
              .then(logOutput => {
                return res.send('success')
              })
          })
      })
      .catch(error => {console.log(error); res.send("Trouble Publishing This Story at This Time")});
  },
  getFeaturedList() {
    // TODO: There is a bug when an odd number of elements are in the carousel.
    // Duplicating the list is a temporary fix
    return featuredStories.concat(featuredStories);
  },


  destroy(req, res) {
    return Story
      .find({
          where: {
            id: req.params.StoryId,
            bracketId: req.params.bracketId,
          },
        })
      .then(out => {
        if (!out) {
          return res.status(404).send({
            message: 'Story Not Found',
          });
        }

        return out
          .destroy()
          .then(() => res.status(200).send({ message: 'Player deleted successfully.' }))
          .catch(error => res.status(400).send(error));
      })
      .catch(error => res.status(400).send(error));
  },
  bulkCreate(array){
    for (var i=0; i < array.length; i++){
      Story.create({
        qid: array[i],
        status: 'basic',
      })
    }
  }
};
