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
}
