const wdk = require('wikidata-sdk');
const fetch = require('node-fetch');
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;
const sparqlController = require('./sparql');
const fs = require('fs');
iconMap =  JSON.parse(fs.readFileSync("server/controllers/iconMap.json"));
itemTypeMap =  JSON.parse(fs.readFileSync("server/controllers/itemTypeMap.json"));
module.exports = {
  bibliography(req, res) {
    const sparql = `
      SELECT ?item
      WHERE
      {
        {?item wdt:P31 wd:Q13442814}
        UNION {?item wdt:P31 wd:Q571}.
        ?item wdt:P921 wd:Q113616.
      }
    `
    const url = wdk.sparqlQuery(sparql);
    appFetch(url).then(content => {
      console.log(content.results.bindings)
      output = content.results.bindings
      var qidString = '';
      // TODO: HANDLE MORE THAN 50 RESULTS
      for(var i = 0; i < output.length && i < 50; i++){
        //Current uri for Wikidata is a url that is http://www.wikidata.org/entity/<qid>
        qidString  += '|'+output[i].item.value.substr(31,);
      }
      qidString = qidString.substr(1,)
      var browseUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qidString}&languages=en&format=json`
      return appFetch(browseUrl).then(content => {
        console.log(content.entities)
        return content.entities
        // console.log(content.results.bindings)
        return content.results.bindings
      }
    ).then(simplifiedResults => loadPage(res, req, 'base', {file_id:'bibliography', nav:'bibliography', works: simplifiedResults}))

  })



  },
  customQuery(req, res) {
    var wd_url = wdk.sparqlQuery(req.body.query);
    appFetch(wd_url).then(content => {
      return content.results.bindings
    }
  ).then(simplifiedResults => res.status(200).send(simplifiedResults))

  },

  processStory(req, res, row) {
    // const jsonData = JSON.parse(fs.readFileSync("moments/hopper.json"));
    const jsonData = row.data
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
    appFetch(url).then(content => {
      // console.log(content.results.bindings)
      output = content.results.bindings.map(function(x){
        if (x.url != null) x.url.value = x.url.value.replace('$1', x.ps_Label.value)
        return x
      })
      // console.log(output)
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
        qid: simplifiedResults.qid,
        data: jsonData
      })
        })

  })

  },
  processAnnotation(req, res){
    qid = req.params.qid;
    appFetch(sparqlController.getClaims(qid, 'en'))
      .then(content => {
        claims = content.results.bindings
        appFetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|claims|sitelinks&sitefilter=enwiki&languages=en`)
        .then(labels => {
          name = labels.entities[qid].labels.en.value
          // find type
          itemType = "other"
          itemIcon = "fas fa-globe"
          instances = labels.entities[qid].claims['P31']
          for (clm in instances){
            temp = iconMap[instances[clm].mainsnak.datavalue.value.id];
            if (temp){
              itemType = temp.type;
              itemIcon = temp.icon;
              break;
            }
          }
          wikipedia = ''
          if (labels.entities[qid].sitelinks.enwiki){
            wikipedia = labels.entities[qid].sitelinks.enwiki.title.replace(' ', '_')
          }
          itemTypeMapDetails = itemTypeMap[itemType];
          itemProps = itemTypeMapDetails.properties;
          annotationData = {
            "type": itemType,
            "icon": itemIcon,
            "label": name,
            "summary": "",
            "wikipedia": wikipedia,
            "image": '',
            "facts": {},
            "pronoun": itemTypeMapDetails.pronouns.interrogative
          }
          function addVal(pval, fact, prop, val){
            if (pval == `http://www.wikidata.org/prop/statement/${prop}`){
              if (!annotationData.facts[fact]){
                  annotationData.facts[fact] = val
              }
              else if (annotationData.facts[fact].includes(val)){
              }
              else{
                  annotationData.facts[fact] += ', '+ val
              }
            }
          }

          for (i=0; i < claims.length; i++){
            clm = claims[i]
            pval = clm.ps.value
            val = clm.ps_Label.value
            if (pval == "http://www.wikidata.org/prop/statement/P18"){
              annotationData["image"] = clm.ps_Label.value
            }
            for (j=0; j < itemProps.length; j++){
              addVal(pval, clm.wdLabel.value, itemProps[j], val)
            }
          }
          if (wikipedia.length){
            return appFetch('https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles='+wikipedia)
              .then(wikipediaData => {
                for (item in wikipediaData.query.pages){
                  annotationData['summary'] = wikipediaData.query.pages[item].extract;
                }
                return res.send(annotationData)
              })
          }
          else{
            return res.send(annotationData)
          }


        })
      })

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
