const Story = require('../models').story;
const LogStory = require('../models').logstory;
const wdk = require('wikidata-sdk');
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;
const wikidataController = require('./wikidata');
const loadError =  require('../../app').loadError;

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
          console.log(story.data)
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
    return wikidataController.searchItems(req, res, req.query.search, function(results){
      // console.log(results)
      return Story.findAll({where: {qid:results}})
        .then(stories => {
          // console.log(stories)
          qidList = []
          for (i=0;i < stories.length; i++){
            qidList.push(stories[i].dataValues.qid)
          }
          data = {}
          wikidataController.getDetailsList(req, res, qidList, 'small', function(detailList){
            for(var i = 0; i < detailList.length; i++){
                for(var key in stories[i].dataValues) detailList[i][key] =stories[i].dataValues[key];
              }
            data['results'] = detailList
            loadPage(res, req, 'base', {file_id:'search',  title:'Search '+req.query.search, nav:'search', data:data})
          })
        })
    })
  },
  browse(req, res) {
    return Story
      .all()
      .then(out => {
        story_total = out.length;
        qidList = [];
        for(var i = 0; i < story_total; i++){
          qidList.push(out[i].dataValues.qid)
        }
        data = {}
        return wikidataController.getDetailsList(req, res, qidList, 'small_with_age',
          function(qidList){
            for(var i = 0; i < story_total; i++){
              for(var key in out[i].dataValues) {
                qidList[i][key] = out[i].dataValues[key];
              }
            }
            data['browseList'] = qidList
            loadPage(res, req, 'base', {file_id:'browse',  title:'Browse Stories', nav:'browse', data:data})
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
      .catch(error => res.status(400).send(error));
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
