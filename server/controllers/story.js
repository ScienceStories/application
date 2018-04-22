const Story = require('../models').story;
const wdk = require('wikidata-sdk');
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;

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
      })
      .then(out => res.status(201).redirect('/'+qid))
      .catch(error => res.status(400).send(error));
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
        for(var i = 0; i < story_total; i++){
            qidString  += '|'+out[i].dataValues.qid;
          }
          qidString = qidString.substr(1,)
          // console.log(qidString)
          var wd_url = wdk.sparqlQuery(query);
          // console.log(wd_url);
          var qidsApi = 'Q11641|Q5298518|Q7309|Q6376201|Q451538'+ '|Q505476|Q5092271|Q446848|Q4273363|Q30320358|Q1601832';
          var browseUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qidString}&languages=en&format=json`
          appFetch(browseUrl).then(content => {
            // console.log(content.entities.Q6376201.claims.P5690.mainsnak)
            return content.entities
            // console.log(content.results.bindings)
            return content.results.bindings
          }
        ).then(simplifiedResults => loadPage(res, req, 'base', {file_id:'browse', nav:'browse', stories: simplifiedResults}))
      })
      .catch(error => {console.log(error);res.status(400).send(error)});
  },
  update(req, res) {
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
          .update(req.body, { fields: Object.keys(req.body) })
          .then(updatedStory => res.status(200).send(updatedStory))
          .catch(error => res.status(400).send(error));
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
};
