const wdk = require('wikidata-sdk');
const fetch = require('node-fetch');
const appFetch =  require('../../app').appFetch;

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
    appFetch(url).then(content => {
      // console.log(content.results.bindings)
      output = content.results.bindings.map(function(x){
        if (x.url != null) x.url.value = x.url.value.replace('$1', x.ps_Label.value)
        return x
      })
      console.log(output)
      return {qid:qid, statements: output}
    }
      ).then(simplifiedResults =>
      {

        appFetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|sitelinks&sitefilter=enwiki&languages=en`)
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
    appFetch(wd_url).then(content => {
      return content.results.bindings
    }
  ).then(simplifiedResults => res.status(200).send(simplifiedResults))

  },

};

// SELECT ?story ?storyLabel ?birth ?death
// WHERE
// {
//   SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
//     VALUES ?story { wd:Q11641  wd:Q7309 wd:Q6376201 }.
//     OPTIONAL{
//     ?story wdt:P569 ?birth.
//       }
//   OPTIONAL{
//     ?story wdt:P570 ?death.
//       }
//   OPTIONAL{
//     ?story wdt:P13 ?image.
//       }
// }
