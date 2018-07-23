const Story = require('../models').story;
const LogStory = require('../models').logstory;
const wdk = require('wikidata-sdk');
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;
const wikidataController = require('./wikidata');
const loadError =  require('../../app').loadError;
const sequelize = require('../models').sequelize;
module.exports = {
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
          return loadError(req, res, 'This story has not yet been curated.');
        }
        return wikidataController.processStory(req, res, out);
      })
      .catch(error => loadError(req, res, 'Trouble Loading this Story'));
  },
  getData(qid, next){
    return Story.findOne({where: {qid:qid}})
  },
  build(req, res){
    if (req.query.qid){
      Story.findOne({where: {qid:req.query.qid}})
        .then(story => {
          return loadPage(res, req, 'base', {file_id:'build',  title:'Story Creation', nav:'build', data:{moments:story.data}, idVal:req.query.qid.substr(1)})
        })
    }
    else{
      return loadPage(res, req, 'base', {file_id:'build',  title:'Story Creation', nav:'build'})
    }
  },
  preview(req, res) {
    // console.log(req.query.data)
    req.params.id = req.query.id
    // console.log(req.params.id, req.query.id )
    return wikidataController.processStory(req, res, {data: JSON.parse(req.query.data)});
  },
  search(req, res) {
    searchString = req.query.search.toLowerCase().trim()
    if (!searchString.length) loadError(req, res, 'No Search Detected')
    return wikidataController.searchItems(req, res, searchString, function(results){
      // console.log(results)
      return Story.findAll({where: {qid:results}})
        .then(stories => {
          // console.log(stories)
          var resultQids = []
          for (i=0;i < stories.length; i++){
            resultQids.push(stories[i].dataValues.qid)
          }
          data = {}
          return Story.findAll()
            .then(allStories => {
              allIds = []
              for (i=0;i < allStories.length; i++){
                allIds.push(allStories[i].dataValues.qid)
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
                  if  ((objectStr.indexOf(searchString) > -1) && (resultQids.indexOf(alldetailList[i].qid) == -1) ){
                    var newItem = alldetailList[i]
                    for(var key in allStories[i].dataValues) newItem[key] = allStories[i].dataValues[key];
                    detailList.push(newItem)
                  }
                }
                data['results'] = detailList
                loadPage(res, req, 'base', {file_id:'search',  title:'Search '+req.query.search, nav:'search', data:data})
              })})
            })
            })
    })
  },
  browse(req, res) {
    page = (req.query.page) ? parseInt(req.query.page, 10) : 1
    stories_per_page = 50
    offset = (page-1)*stories_per_page
    return Story.count().then(total_stories => {
      maxPage = Math.ceil(total_stories/stories_per_page) + 1
      nextPage = (page == maxPage) ? 0 : page + 1
      prevPage = (page == 1) ? 0 : page - 1
      data = {totalStories:total_stories, page:page, maxPage: maxPage, prevPage:prevPage, nextPage:nextPage}
      Story.findAll({ offset: offset, limit: stories_per_page })
      .then(out => {
          story_total = out.length;
          qidList = [];
          for(var i = 0; i < story_total; i++){
            qidList.push(out[i].dataValues.qid)
          }

          return wikidataController.getDetailsList(req, res, qidList, 'small_with_age', 'first', false,
            function(qidList){
              for(var i = 0; i < story_total; i++){
                for(var key in out[i].dataValues) {
                  qidList[i][key] = out[i].dataValues[key];
                }
              }
              data['browseList'] = qidList
              loadPage(res, req, 'base', {file_id:'browse',  title:`Browse Stories (Page ${page})`, nav:'browse', data:data})
            })
        })
    })
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
