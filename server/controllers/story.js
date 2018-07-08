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
  browse(req, res) {
    return Story
      .all()
      .then(out => {
        var qids = 'wd:Q11641  wd:Q7309 wd:Q6376201';
        var query = `
        SELECT ?story ?storyLabel ?storyDescription ?birth ?death ?image
WHERE
{
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    VALUES ?story { ${qids} }.
    OPTIONAL{
    ?story wdt:P569 ?_birth.
      bind (year(?_birth) as ?birth).
      }
  OPTIONAL{
    ?story wdt:P570 ?_death.
    bind (year(?_death) as ?death)
      }
  OPTIONAL{
    ?story wdt:P18|wdt:P117 ?image.
      }
}
        `
        // console.log(out);
        qidString = '';
        story_total = out.length;
        qidList = []
        //TODO: Make Work for more than 50
        for(var i = 0; i < story_total && i < 50; i++){
            qidString  += '|'+out[i].dataValues.qid;
          }
          for(var i = 0; i < story_total; i++){
              qidString  += '|'+out[i].dataValues.qid;
              qidList.push(out[i].dataValues.qid)
            }
            data = {}
            return wikidataController.getDetailsList(req, res, qidList, 'small_with_age', function(qidList){
              for(var i = 0; i < story_total; i++){
                  for(var key in out[i].dataValues) qidList[i][key] = out[i].dataValues[key];
                }
              data['browseList'] = qidList
              loadPage(res, req, 'base', {file_id:'browse',  title:'Browse Stories', nav:'browse', data:data})

            })
          qidString = qidString.substr(1,)
          // console.log(qidString)
          var wd_url = wdk.sparqlQuery(query);
          // console.log(wd_url);
          var qidsApi = 'Q11641|Q5298518|Q7309|Q6376201|Q451538';
          var browseUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qidString}&languages=en&format=json`
          appFetch(browseUrl).then(content => {
            // console.log(content.entities.Q6376201.claims.P5690.mainsnak)
            return content.entities
            // console.log(content.results.bindings)
            return content.results.bindings
          }
        ).then(simplifiedResults => loadPage(res, req, 'base', {file_id:'browse',  title:'Browse Stories', nav:'browse', stories: simplifiedResults}))
      })
      .catch(error => {console.log(error);res.status(400).send(error)});
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
