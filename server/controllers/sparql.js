const wdk = require('wikidata-sdk');
const fetch = require('node-fetch');
const appFetch =  require('../../app').appFetch;
module.exports = {
  getClaims(qid, lang){
    var query = `
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
    return wdk.sparqlQuery(query);

  },
  getInverseClaims(qid, lang){
    var query = `SELECT   ?ps ?wdLabel ?wdDescription ?datatype ?ps_Label ?ps_ ?wdpqLabel  ?wdpq ?pq_Label ?url ?img ?location ?objLocation ?locationImage ?objDate ?objProp
?objBirth ?objDeath{
      VALUES (?oldps_) {(wd:${qid})}
      ?ps_ ?p ?statement .
      ?statement ?ps ?oldps_ .
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
        OPTIONAL{
   ?ps_ wdt:P18 ?img .
   }
   OPTIONAL{
     ?ps_ wdt:P276|wdt:P159 ?objLocationEntity .
     ?objLocationEntity wdt:P625 ?objLocation.
     OPTIONAL{?objLocationEntity wdt:P18 ?locationImage.}
   }
   OPTIONAL{
   ?ps_ wdt:P625 ?location .
   }
     OPTIONAL{
     ?ps_ wdt:P571|wdt:P577 ?objDate .
   }
  OPTIONAL{
     ?ps_ wdt:P569 ?objBirth .
   }
  OPTIONAL{
     ?ps_ wdt:P570 ?objDeath .
   }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?wd ?statement ?oldps_`
    return wdk.sparqlQuery(query);
  },
  getSmallDetailsList(qidList, lang){
    var qidStr = ''
    for (var i=0; i < qidList.length; i++){
      qidStr += `(wd:${qidList[i]} ${i}) `
    }
    var query = `
      SELECT ?item ?itemLabel  ?itemDescription ?image #
      WHERE {
        VALUES (?item ?place) { ${qidStr} }.
        optional {?item wdt:P18 ?image  .}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      ORDER BY ?place
    `
    return wdk.sparqlQuery(query);
  },
  getSmallDetailsListWithAge(qidList, lang){
    var qidStr = ''
    for (var i=0; i < qidList.length; i++){
      qidStr += `(wd:${qidList[i]} ${i}) `
    }
    var query = `
      SELECT ?item ?itemLabel  ?itemDescription ?image ?birth ?death
      WHERE {
        VALUES (?item ?place) { ${qidStr} }.
        optional {?item wdt:P18 ?image  .}
        optional {?item wdt:P569 ?birth  .}
        optional {?item wdt:P570 ?death  .}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      ORDER BY ?place
    `
    return wdk.sparqlQuery(query);
  },
  getBibliography(lang){
    var query = `
    SELECT ?item ?itemLabel ?itemDescription ?instanceLabel ?authorLabel ?image
    WHERE
    {
      {?item wdt:P31 wd:Q13442814}
      UNION {?item wdt:P31 wd:Q571}.
      ?item wdt:P921 wd:Q113616.
      ?item wdt:P31 ?instance.
      optional {?item wdt:P2093 ?author.}
      optional {?item wdt:P18 ?image  .}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    `
    return wdk.sparqlQuery(query);
  },
  getNamedAfter(item, lang){
    var query = `#defaultView:Map
SELECT ?truc ?presLabel ?trucLabel ?coord ?layer WHERE {
  {
    SELECT DISTINCT ?truc (SAMPLE(?coord) AS ?coord) (SAMPLE(?layer) AS ?layer) WHERE {
     VALUES ( ?pres) {(wd:Q11641) } .

      ?truc wdt:P138 ?pres .
      optional {
       ?truc     wdt:P625 ?coord.
        }
    }
    GROUP BY ?truc ?trucLabel
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
return wdk.sparqlQuery(query);
  }
}
