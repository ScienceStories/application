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
    const qid = req.params.qid;
    const sparql = `
      SELECT ?wdLabel ?ps_Label ?wdpqLabel ?pq_Label {
        VALUES (?company) {(wd:${qid})}
        ?company ?p ?statement .
        ?statement ?ps ?ps_ .
        ?wd wikibase:claim ?p.
        ?wd wikibase:statementProperty ?ps.
        OPTIONAL {
        ?statement ?pq ?pq_ .
        ?wdpq wikibase:qualifier ?pq .
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      } ORDER BY ?wd ?statement ?ps_
    `
    const url = wdk.sparqlQuery(sparql);

    _api(url).then(content => {
      return content.results.bindings
    }
      ).then(simplifiedResults =>
      {
        _api(`https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&ids=${qid}&languages=en&format=json`)
        .then(labels => {
          // const simplifiedResults = wdk.simplifySparqlResults(content)
          return res.render('base', {
        page: function(){ return 'story'},
        scripts: function(){ return 'story_scripts'},
        links: function(){ return 'story_links'},
        title: "Story",
        nav: "Story",
        content: simplifiedResults,
        name: labels.entities[qid].labels.en.value,
      })
        })

  })

  },


};
