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
}
