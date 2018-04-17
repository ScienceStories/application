const wdk = require('wikidata-sdk');
const fetch = require('node-fetch');
function _api(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(res => res.json())
      .then(data => resolve(data))
      .catch(err => reject(err))
  })
}
module.exports = {
  loadStory(req, res) {
    const qid = 'Q'+req.params.id;
    const sparql = `
    SELECT ?ps ?wdLabel ?datatype ?ps_Label ?ps_ ?wdpqLabel ?pq_Label ?url {
      VALUES (?company) {(wd:${qid})}
      ?company ?p ?statement .
      ?statement ?ps ?ps_ .
      ?wd wikibase:claim ?p.
      ?wd wikibase:statementProperty ?ps.
      ?wd wikibase:propertyType  ?datatype.
      OPTIONAL {
      ?statement ?pq ?pq_ .
      ?wdpq wikibase:qualifier ?pq .
      }
      OPTIONAL {
        ?wd wdt:P1630 ?url  .
        }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?wd ?statement ?ps_
    `
    const url = wdk.sparqlQuery(sparql);
console.log(url)
    _api(url).then(content => {
      // console.log(content.results.bindings)
      return {qid:qid, statements: content.results.bindings}
    }
      ).then(simplifiedResults =>
      {

        _api(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|sitelinks&sitefilter=enwiki&languages=en`)
        .then(labels => {
          name = labels.entities[qid].labels.en.value
          wikipedia = ''
          if (labels.entities[qid].sitelinks.enwiki){
            wikipedia = labels.entities[qid].sitelinks.enwiki.title
          }
          return res.render('full', {
        page: function(){ return 'story'},
        scripts: function(){ return 'story_scripts'},
        links: function(){ return 'story_links'},
        title: name +" - Story",
        nav: "Story",
        content: simplifiedResults.statements,
        wikipedia: wikipedia,
        name: name,
        qid: simplifiedResults.qid
      })
        })

  })

  },
  customQuery(req, res) {
    var wd_url = wdk.sparqlQuery(req.body.query);
    _api(wd_url).then(content => {
      return content.results.bindings
    }
  ).then(simplifiedResults => res.status(200).send(simplifiedResults))

  },

};
