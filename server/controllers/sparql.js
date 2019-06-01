const wdk = require('wikidata-sdk');
const appFetch =  require('../../app').appFetch;
const _ = module.exports = {
  execute(query, callback){
    let query_url = 'https://query.wikidata.org/sparql?format=json';
    let reqParams = {
      headers: { Accept: 'application/sparql-results+json' }
    }
    if (query.length < 1000){
      query_url = wdk.sparqlQuery(query);
      reqParams.method = 'GET';
    }
    else {
      const { URLSearchParams } = require('url');
      const params = new URLSearchParams();
      params.append('query', query);
      reqParams.method = 'POST';
      reqParams.body = params;
    }
    return appFetch(query_url, reqParams).then(wdk.simplify.sparqlResults)
      .then(content => callback(content));
  },
  valuesFromArray(qidList, keepOrder=false){
    let qidStr = '';
    if (keepOrder) for (let i in qidList) qidStr += `(wd:${qidList[i]} ${i}) `;
    else for (let i in qidList) qidStr += `(wd:${qidList[i]}) `;
    return qidStr;
  },
  getClaims(qid, lang){
    var query = `
    SELECT ?ps ?wdLabel ?datatype ?ps_Label ?ps_ ?wdpq ?wdpqLabel ?pq_Label ?url {
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
  getAnnotationData(qid, callback){
    return _.execute(`
      SELECT ?item ?itemLabel ?instance ?instanceLabel
      WHERE {
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
        }
        VALUES (?item) {(wd:${qid})}.
        ?item wdt:P31 ?instance.
      }
    `, callback);
  },
  getStoryValidation(qid, callback){
    return _.execute(`
      SELECT ?story ?storyLabel
      WHERE {
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
        }
        VALUES (?story) {(wd:${qid})}.
        ?story wdt:P31 wd:Q5.
      }
    `, callback);
  },
  getStoryClaims(qid, lang){
    const query = `
    SELECT ?statement ?ps ?wdLabel ?wdDescription ?datatype ?ps_Label ?ps_Description ?ps_ ?wdpqLabel  ?wdpq ?pq_Label ?url ?img ?logo ?location ?objLocation ?objLocationEntityLabel ?locationImage ?objInstance ?objInstanceLabel ?objWebsite ?objBirth ?objDeath ?conferred ?conferredLabel{
    VALUES (?company) {(wd:${qid})}
    ?company ?p ?statement .
    ?statement ?ps ?ps_ .
    ?wd wikibase:claim ?p.
    ?wd wikibase:statementProperty ?ps.
    ?wd wikibase:propertyType  ?datatype.
    FILTER (?ps != ps:P1889).
    OPTIONAL {
    ?statement ?pq ?pq_ .
    ?wdpq wikibase:qualifier ?pq .
    }
OPTIONAL{
   ?ps_ wdt:P31 ?objInstance .
 }
    OPTIONAL {
      ?wd wdt:P1630 ?url  .
      }
  OPTIONAL {
  ?ps_ wdt:P856 ?objWebsite .
  }
      OPTIONAL{
 ?ps_ wdt:P18 ?img .
 }
      OPTIONAL{
 ?ps_ wdt:P154 ?logo .
 }
        OPTIONAL{
 ?ps_ wdt:P569 ?objBirth .
 }
  OPTIONAL{
 ?ps_ wdt:P570 ?objDeath .
 }
 OPTIONAL{
   ?ps_ wdt:P276|wdt:P159 ?objLocationEntity .
   ?objLocationEntity wdt:P625 ?objLocation.
   OPTIONAL{?objLocationEntity wdt:P18 ?locationImage.}
 }
 OPTIONAL{
   ?ps_ wdt:P1027 ?conferred.
   }
 OPTIONAL{
 ?ps_ wdt:P625 ?location .
 }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } ORDER BY ?wd ?statement ?ps_

    `
    return wdk.sparqlQuery(query);
  },
  getInverseClaims(qid, lang){
    var query = `SELECT ?statement ?ps ?ps_Description ?wdLabel ?wdDescription ?datatype ?ps_Label ?ps_ ?wdpqLabel  ?wdpq ?pq_Label ?url ?img ?location ?objLocation ?objLocationEntityLabel ?locationImage ?objDate ?objProp
      ?objBirth ?objDeath ?objInstance ?objInstanceLabel ?manifest ?manifest_collectionLabel  ?personPropLabel ?person ?personLabel ?personDescription ?personBirth ?personDeath ?personImg ?doi ?handle ?full_work ?website{
      VALUES (?oldps_) {(wd:${qid})}
      ?ps_ ?p ?statement .
      ?statement ?ps ?oldps_ .
      ?wd wikibase:claim ?p.
      ?wd wikibase:statementProperty ?ps.
      ?wd wikibase:propertyType  ?datatype.
      FILTER (?ps != ps:P1889).
   OPTIONAL {
     ?statement ?pq ?pq_ .
     ?wdpq wikibase:qualifier ?pq.
   }
   OPTIONAL {?wd wdt:P1630 ?url.}
   OPTIONAL {?ps_ wdt:P856 ?website.}
   OPTIONAL {?ps_ wdt:P953 ?full_work.}
   OPTIONAL{?ps_ wdt:P356 ?doi.}
   OPTIONAL{?ps_ wdt:P1184 ?handle}
   OPTIONAL{?ps_ wdt:P18 ?img .}
   OPTIONAL{
     ?ps_ wdt:P276|wdt:P159 ?objLocationEntity .
     ?objLocationEntity wdt:P625 ?objLocation.
     OPTIONAL{?objLocationEntity wdt:P18 ?locationImage.}
   }
  OPTIONAL{
    ?ps_ wdt:P50|wdt:P112|wdt:P1029 ?isperson . # check that the person's contribution matches the main person (i.e. both authors)
    ?ps_ ?tval ?person .
    ?person wdt:P31 wd:Q5 .
    ?personProp wikibase:directClaim ?tval.
    filter( ?isperson = ?oldps_).
    filter( ?person != ?oldps_).
    OPTIONAL{?person wdt:P569 ?personBirth .}
    OPTIONAL{?person wdt:P570 ?personDeath .}
    OPTIONAL{?person wdt:P18 ?personImg .}
  }
  OPTIONAL{?ps_ wdt:P625 ?location .}
  OPTIONAL{?ps_ wdt:P571|wdt:P577 ?objDate .}
  OPTIONAL{?ps_ wdt:P569 ?objBirth .}
  OPTIONAL{?ps_ wdt:P570 ?objDeath .}
  OPTIONAL{?ps_ wdt:P31 ?objInstance .}
  OPTIONAL{
     ?ps_ wdt:P6108 ?manifest .
     optional{?ps_ wdt:P195 ?manifest_collection.}
   }
   SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
} ORDER BY ?wd ?statement ?ps_`
    return wdk.sparqlQuery(query);
  },
  getSmallDetailsList(qidList, lang){
    // TODO: This query is ran 3 times on overview page, we should consolidate
    let values = _.valuesFromArray(qidList, true);
    let query = `
      SELECT ?item ?itemLabel  ?itemDescription ?image #
      WHERE {
        VALUES (?item ?place) { ${values} }.
        optional {?item wdt:P18 ?image  .}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      ORDER BY ?place
    `
    return wdk.sparqlQuery(query);
  },
  getSmallDetailsListWithAge(qidList, lang){
    let values = _.valuesFromArray(qidList, true);
    let query = `
      SELECT ?item ?itemLabel  ?itemDescription ?image ?birth ?death
      WHERE {
        VALUES (?item ?place) { ${values} }.
        optional {?item wdt:P18 ?image  .}
        optional {?item wdt:P569 ?birth  .}
        optional {?item wdt:P570 ?death  .}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      ORDER BY ?place
    `
    return wdk.sparqlQuery(query);
  },
  birthdayQuery(qidList, callback){
    let values = _.valuesFromArray(qidList, true);
    return _.execute(`
      SELECT ?index ?item ?itemLabel ?itemDescription ?image
        (YEAR(?date) as ?year) (?nowYear-?year as ?age) (?date as ?birth) ?death
      WHERE {
        VALUES (?item ?index) {${values}}.
        BIND(NOW() AS ?now).
        BIND(MONTH(?now) AS ?nowMonth).
        BIND(DAY(?now) AS ?nowDay).
        BIND(YEAR(?now) AS ?nowYear).
        ?item wdt:P569 ?date .
        ?item wdt:P570 ?death .
        optional {?item wdt:P18 ?image .}
        FILTER (MONTH(?date) = ?nowMonth && DAY(?date) = ?nowDay)
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `, callback);
  },
  getBibliography(lang, callback){
    return _.execute(`
      SELECT ?item ?itemLabel ?itemDescription ?instance ?instanceLabel ?author
      WHERE{
        {?item wdt:P31 wd:Q13442814}
        UNION {?item wdt:P31 wd:Q571}
        UNION {?item wdt:P31 wd:Q10870555}.
        ?item wdt:P921 wd:Q113616.
        ?item wdt:P31 ?instance.
        optional {?item wdt:P2093 ?author.}
        SERVICE wikibase:label
        { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
    `, callback);
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
  },
  getCommonsCategory(item, callback){
    return _.execute(`
      SELECT ?item ?category
      WHERE {
        VALUES (?item) { (wd:${item}) }.
        ?item wdt:P373 ?category.
      }
    `, callback);
  }
}
