const wdk = require('wikidata-sdk');
const getURLPath = require('../../app').getURLPath;
const appFetch = require('../../app').appFetch;
const safeOverwrite = require('../utils').safeOverwrite;
const JSONFile = require('../utils').JSONFile;
const getValue = require('../utils').getValue;
const sparqlController = require('./sparql');
const commentController = require('./comment');
const wikicommonsController = require('./wikicommons');
const StoryActivity = require('../models').storyactivity;
const sequelize = require('../models').sequelize;
const moment = require('moment');
const randomColor = require('randomcolor');
const iconMap = JSONFile("server/controllers/iconMap.json");
const itemTypeMap = JSONFile("server/controllers/itemTypeMap.json");
const wikidataMap = JSONFile("server/controllers/wikidataMap.json");

const _ = module.exports = {
  bibliography(req, res) {
    return sparqlController.getBibliography('en', output => {
      let works = {};
      for(i=0; i < output.length; i++){
        let record = output[i];
        let qid = record.item.value;
        if (!works[qid]){
          works[qid] = record;
        }
        else if(works[qid] && works[qid].author.indexOf(record.author) == -1 ) {
          works[qid].author += ' | ' + record.author;
        }
      }
      let pageData = {title:'Bibliography', works: works};
      return res.renderPage('base', 'bibliography', pageData);
    });
  },
  searchItems(req, res, string, callback){
    var search_url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${string}&language=en&format=json`
    return appFetch(search_url).then(content => {
      let qidList = [];
      for (let i=0; i < content.search.length; i++){
        qidList.push(content.search[i].id);
      }
      return callback(qidList);
    })
  },
  mergeValuesComma(){
    // TODO:
  },
  mergeValuesList(){
    // TODO:
  },
  mergeValuesFirst(qidList, rawData){
    let tempQidList = qidList.slice();
    let content = [];
    for (let i=0; i<rawData.length;i++){
      let val = rawData[i];
      let qid = val.item.value.replace('http://www.wikidata.org/entity/', '');
      let index = tempQidList.indexOf(qid);
      if (index > -1) {
        tempQidList.splice(index, 1);
        let newRecord = {qid: qid}
        for(let key in val) newRecord[key] = getValue(val[key]);
        content.push(newRecord);
      }
    }
    return content;
  },
  processDetailListSection(queryFunction, output, qidSet, setIndex, callback){
    // TODO: Remove the recursion and call wikimedia via POST
    let queryUrl = queryFunction(qidSet[setIndex], 'en');
    return appFetch(queryUrl).then(sectionOutput => {
      sectionOutput = sectionOutput.results.bindings;
      for (let i = 0; i < sectionOutput.length; i++) {
        output.push(sectionOutput[i])
      }
      setIndex += 1;
      if (setIndex < qidSet.length){
        return _.processDetailListSection(queryFunction, output, qidSet, setIndex, callback);
      }
      return callback(output);
    })
  },
  processDetailList(req, res, queryFunction, qidList, callback, mergeType, defaultImage){
    var qidSet = [[]];
    var thisSet = 0;
    var maxLength = 50;
    var check = 0;
    for (var i = 0; i < qidList.length; i++) {
      if (check == maxLength){
        check = 0;
        thisSet += 1;
        qidSet.push([qidList[i]]);
      }
      else {
        qidSet[thisSet].push(qidList[i]);
        check += 1;
      }
    }
    return _.processDetailListSection(queryFunction, [], qidSet, 0, output => {
      if (!mergeType || mergeType == 'first'){
        content = _.mergeValuesFirst(qidList, output);
        if (defaultImage){
          for (let i=0; i<content.length; i++){
            if (!content[i].image) content[i].image = defaultImage;
          }
        }
        return callback(content);
      }
    })
  },

  simplifySparqlFetch(content){
    return content.results.bindings.map(function(x){
      if (x.url != null) x.url.value = x.url.value.replace('$1', x.ps_Label.value);
      return x;
    })
  },
  getDetailsList(req, res, qidList, detailLevel, mergeType=false, defaultImage=false, callback){
    if (detailLevel == 'small'){
      //  label, description, optional image
      return _.processDetailList(req, res, sparqlController.getSmallDetailsList, qidList, callback, mergeType, defaultImage)
    }
    else if (detailLevel == 'small_with_age'){
      // label, description, optional image
      return _.processDetailList(req, res, sparqlController.getSmallDetailsListWithAge, qidList, callback, mergeType, defaultImage)
    }
  },
  customQuery(req, res) {
    var wd_url = wdk.sparqlQuery(req.body.query);
    appFetch(wd_url).then(content => {
      return content.results.bindings
    }).then(simplifiedResults => res.status(200).send(simplifiedResults))
  },
  storyValidate(qid, callback){
    return sparqlController.getStoryValidation(qid, wikidataResponse => {
      if (wikidataResponse.length) return callback(true);
      return callback(false);
    })
  },
  filterProperties(statements){
    for (var i=0; i < statements.length; i++){
      if (statements[i].ps.value == "http://www.wikidata.org/prop/statement/P1889"){
        statements.splice(i, 1);
      }
    }
    return statements;
  },
  processStory(req, res, row) {
    let jsonData = row.data
    const qid = 'Q'+req.params.id;
    const sparql = `
    SELECT ?statement ?ps ?wdLabel ?wdDescription ?datatype ?ps_Label ?ps_Description ?ps_ ?wdpqLabel  ?wdpq ?pq_Label ?url ?img ?logo ?location ?objLocation ?objLocationEntityLabel ?locationImage ?objInstance ?objInstanceLabel ?objWebsite ?objBirth ?objDeath ?conferred ?conferredLabel{
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
    const url = wdk.sparqlQuery(sparql);
    appFetch(url).then(itemStatements => {
      itemStatements = _.simplifySparqlFetch(itemStatements)
      itemStatements = _.filterProperties(itemStatements)
      var inverseUrl = sparqlController.getInverseClaims(qid, 'en')
      appFetch(inverseUrl).then(inverseClaimsOutput => {
        inverseStatements = _.simplifySparqlFetch(inverseClaimsOutput);
        inverseStatements = _.filterProperties(inverseStatements);
        let labelURL = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|sitelinks&sitefilter=enwiki&languages=en`
        appFetch(labelURL).then(labels => {
          name = labels.entities[qid].labels.en.value;
          meta = {};
          meta.description = `Visually learn about ${name}. View the ${name} Science Story that compiles the multimedia (images, videos, pictures, works, etc.) found throughout the web and enriches their content using Wikimedia via Wikidata, Wikipedia, and Commons alongside YouTube Videos, IIIF Manifests, Library Archives and more.`
          wikipedia = '';
          if (labels.entities[qid].sitelinks.enwiki){
            wikipedia = labels.entities[qid].sitelinks.enwiki.title;
          }
          return _.getMainStoryImage(row.data, itemStatements, (storyImage) => {
            return _.getPeopleData(name, itemStatements, inverseStatements, (peopleData) => {
              return _.getEducationData(itemStatements, (educationData) => {
                return _.getEmployerData(itemStatements, (employerData) => {
                  return _.getAwardData(name, itemStatements, (awardData) => {
                    return _.getLibraryData(name, inverseStatements, (libraryData) => {
                      return _.getMapData(name, itemStatements, inverseStatements, (mapData) => {
                        return _.getWikiCreationDates(qid, wikipedia, (wikidata_date, wikipedia_date) => {
                          let ss_string = (row.createdAt) ? row.createdAt.toISOString() : null;
                          let timelineData =  _.getTimelineData(name, itemStatements, inverseStatements, wikidata_date, wikipedia_date, ss_string);
                          return _.getWikidataManifestData(name, itemStatements, inverseStatements, (wikidataManifestData) => {
                            jsonData = jsonData.concat(wikidataManifestData);
                            let commonsCategory = _.getCommonsCategory(req, qid, itemStatements);
                            var isPreview = (req.url.indexOf('/preview') > -1);
                            let storyRenderData = {
                              page: function(){ return 'story'},
                              scripts: function(){ return 'story_scripts'},
                              links: function(){ return 'story_links'},
                              title: name +" - Story",
                              nav: "Story",
                              urlPath: getURLPath(req),
                              content: itemStatements,
                              wikipedia: wikipedia,
                              name: name,
                              qid: qid,
                              data: jsonData,
                              image: storyImage,
                              row: row,
                              isPreview: isPreview,
                              meta: meta,
                              people: peopleData,
                              education: educationData,
                              employer: employerData,
                              map: mapData,
                              library: libraryData,
                              timeline: timelineData,
                              award: awardData,
                              commonsCategory: commonsCategory
                            }
                            if (req.session.user && !isPreview) {
                              return StoryActivity
                              .findOrCreate({where: {
                                memberId: req.session.user.id,
                                storyId: row.id
                              }})
                              .spread((found, created) => {
                                found.update({
                                  views: found.views+1,
                                  lastViewed: sequelize.fn('NOW')
                                })
                                .then(output => {
                                  storyRenderData.storyActivity = output.dataValues;
                                  storyRenderData.user = req.session.user;
                                  return res.render('full', storyRenderData);
                                })
                              })
                              .catch(error => res.renderError());
                            }
                            return res.render('full', storyRenderData);
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  },
  getStatementValueByProp(statements, prop_id){
    for (let i = 0; i < statements.length; i++) {
      let tempItem = statements[i];
      if (tempItem.ps
        && tempItem.ps.value
        && (tempItem.ps.value == "http://www.wikidata.org/prop/statement/"+prop_id)
        && tempItem.ps_
        && tempItem.ps_.value
      ) return tempItem.ps_.value;
    }
    return false;
  },
  getMainStoryImage(storyData, wikidata, callback){
    for (var i = 0; i < storyData.length; i++) {
      if (storyData[i].image){
        return callback(storyData[i].image)
      }
    }
    let img_val = _.getStatementValueByProp(wikidata, 'P18');
    return (img_val) ? callback(img_val) : callback('http://sciencestories.io/static/images/branding/logo_black.png');
  },
  getCommonsCategory(req, qid, statements){
    let category = _.getStatementValueByProp(statements, 'P373');
    if (category) {
      return category;
    }
    return false;
  },
  processAnnotation(req, res){
    qid = req.params.qid;
    // TODO: simplify using getAnnotationData query
    // return sparqlController.getAnnotationData(qid, (data) => res.send(data))
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
  processMapData(input, inverse=false){
    for (var s=0; s < input.length; s++){
    var tempMapitem = _.checkMapStatement(name, input[s], inverse)
    if (tempMapitem){
      if(mapOutput[tempMapitem.coordinates]) {
        var tempList = mapOutput[tempMapitem.coordinates]
        var foundmap = false
        for (var i = 0; i < mapOutput[tempMapitem.coordinates].length; i++) {

          if (mapOutput[tempMapitem.coordinates][i].title == tempMapitem.title) {
            foundmap = true
            i = mapOutput[tempMapitem.coordinates].length
          }
        }
        if (!foundmap) mapOutput[tempMapitem.coordinates].push(tempMapitem)
      }
      else mapOutput[tempMapitem.coordinates] = [ tempMapitem ]
    }}
  },
  processPeopleData(input, inverse=false){
    for (var s=0; s < input.length; s++){
      var tempPeopleItem = _.checkPeopleStatement(name, input[s], inverse)
      if (tempPeopleItem){
        let tempList = peopleOutput[tempPeopleItem.qid];
        if (!tempList) tempList = {'properties':{}};
        let overwriteKeys = ['qid', 'title', 'description', 'image', 'years'];
        safeOverwrite(tempList, tempPeopleItem, overwriteKeys);
        if (!tempList.relation && tempPeopleItem.relation) tempList.relation = [tempPeopleItem.relation]
        else if (tempList.relation && tempPeopleItem.relation && !tempList.properties[tempPeopleItem.pid]
          && tempList.relation.indexOf(tempPeopleItem.relation) == -1){
          tempList.relation.push(tempPeopleItem.relation)
        }
        if (!tempList.qualifier && tempPeopleItem.qualifier) tempList.qualifier = [tempPeopleItem.qualifier]
        else if (tempList.qualifier && tempPeopleItem.qualifier && tempList.qualifier.indexOf(tempPeopleItem.qualifier) == -1){
          tempList.qualifier.push(tempPeopleItem.qualifier)
        }
        tempList.properties[tempPeopleItem.pid] = true;
        peopleOutput[tempPeopleItem.qid] = tempList;
      }
    }
  },
  processEducationData(input){
    for (var s=0; s < input.length; s++){
      var tempEduItem = _.checkEducationStatement(input[s])
      if (tempEduItem){
        if (!educationOutput[tempEduItem.qid]) educationOutput[tempEduItem.qid] = {}
        var tempList = educationOutput[tempEduItem.qid]
        let overwriteKeys = ['qid', 'title', 'description', 'image', 'logo',
                             'website'];
        safeOverwrite(tempList, tempEduItem, overwriteKeys);
        if (!tempList.degree && tempEduItem.degree) tempList.degree = [tempEduItem.degree]
        else if (tempList.degree && tempEduItem.degree && tempList.degree.indexOf(tempEduItem.degree) == -1){
          tempList.degree.push(tempEduItem.degree)
        }
        if (!tempList.year && tempEduItem.year) tempList.year = [tempEduItem.year]
        else if (tempList.year && tempEduItem.year && tempList.year.indexOf(tempEduItem.year) == -1){
          tempList.year.push(tempEduItem.year)
          tempList.year.sort()
        }
      }
    }
  },
  processEmployerData(input){
    for (let s=0; s < input.length; s++){
      let tempEmpItem = _.checkEmployerStatement(input[s]);
      if (tempEmpItem){
        if (!employerOutput[tempEmpItem.qid]) employerOutput[tempEmpItem.qid] = {}
        let tempList = employerOutput[tempEmpItem.qid]
        let overwriteKeys = ['qid', 'title', 'description', 'image', 'logo',
                             'website', 'location'];
        safeOverwrite(tempList, tempEmpItem, overwriteKeys);
        if (!tempList.quals && tempEmpItem.qual_value) tempList.quals = [{prop:tempEmpItem.qual_prop, value: tempEmpItem.qual_value}]
        else if (tempEmpItem.qual_value && tempList.quals.map(e => e.prop.concat(e.value)).indexOf(tempEmpItem.qual_prop.concat(tempEmpItem.qual_value)) == -1){
          tempList.quals.push({prop:tempEmpItem.qual_prop, value: tempEmpItem.qual_value})
        }
        // Take the smallest date to sort employers
        if (!tempList.year && tempEmpItem.year) tempList.year = tempEmpItem.year;
        else if (tempList.year && tempEmpItem.year){
          tempList.year = Math.min(tempList.year, tempEmpItem.year)
        }
      }
    }
  },
  getWikidataManifestData(name, wdData, inverseData, callback){
    let output = [];
    let manifestFound = {};
    for (var i = 0; i < inverseData.length; i++) {
      let statement = inverseData[i]
      if (statement.manifest && statement.manifest.value && !manifestFound[statement.manifest.value]) {
        let manifest_data = {
          manifestUri: statement.manifest.value,
          viewType: "ImageView",
        };
        if (statement.manifest_collectionLabel
            && statement.manifest_collectionLabel.value){
          manifest_data.location = statement.manifest_collectionLabel.value;
        }
        let manifest = {
          type: "mirador",
          title: statement.ps_Label.value,
          color: randomColor({luminosity: 'dark'}),
          config: {
            data: [manifest_data],
            layout: "1x1"
          }
        };
        if (manifest_data.location){
          manifest.tooltip = manifest_data.location+': '+manifest.title;
        }
        if (statement.ps_Description && statement.ps_Description.value){
          let description = statement.ps_Description.value;
          if (manifest_data.location){
            description += ` (Content Provided By ${manifest_data.location})`
          }
          manifest.description = description;
          manifestFound[manifest_data.manifestUri] = true;
        }
        output.push(manifest);
      }
    }
    return callback(output);
  },
  getMapData(name, wdData, inverseData, callback){
    mapOutput = {}
    _.processMapData(wdData)
    _.processMapData(inverseData, true)
    if (!Object.keys(mapOutput).length) mapOutput = false
    return callback(mapOutput)
  },
  getPeopleData(name, wdData, inverseData, callback){
    peopleOutput = {}
    _.processPeopleData(wdData)
    _.processPeopleData(inverseData, true)
    if (!Object.keys(peopleOutput).length) peopleOutput = false
    return callback(peopleOutput)
  },
  getEducationData(wdData, callback){
    educationOutput = {}
    _.processEducationData(wdData)

    // educationOutput = {'new': educationOutput, 'wd':wdData }
    if (!Object.keys(educationOutput).length) educationOutput = false
    else {
      var educationArray = []
      // Create items array
      var educationArray = Object.keys(educationOutput).map(function(key) {
        return educationOutput[key];
      });

      // Sort the array based on the second element
      educationArray.sort(function(second, first) {
        if (!first.year) return 0
        else if (!second.year) return 1
        return second.year[0] - first.year[0];
      });
      return callback(educationArray)
    }
    return callback(educationOutput)
  },
  getEmployerData(wdData, callback){
    employerOutput = {}
    _.processEmployerData(wdData)

    // employerOutput = {'new': employerOutput, 'wd':wdData }
    if (!Object.keys(employerOutput).length) employerOutput = false
    else {
      var employerArray = []
      // Create items array
      var employerArray = Object.keys(employerOutput).map(function(key) {
        return employerOutput[key];
      });

      // Sort the array based on the second element
      employerArray.sort(function(second, first) {
        if (!first.year) return 0
        else if (!second.year) return 1
        return second.year - first.year;
      });
      return callback(employerArray)
    }
    return callback(employerOutput)
  },
  processTimelineData(timelineMap, timelineOutput, input, inverse=false){
    for (var s=0; s < input.length; s++){
      let item = _.checkTimelineStatement(name, input[s], inverse);
      if (!item) continue;
      let uuid = String(item.title) + String(item.date);
      if (!timelineMap[uuid]){
        timelineOutput.push(item);
        timelineMap[uuid] = true;
      }
    }
  },
  processLibraryData(input){
    let libraryOutput =  {'book': [], 'article': [], 'other': []};
    for (var s=0; s < input.length; s++){
      var tempTLitem = _.checkLibraryStatement(name, input[s])
      if (tempTLitem){
        var foundLib = false
        for (var i = 0; i < libraryOutput[tempTLitem.type].length && !foundLib; i++) {
          var checkOutput = libraryOutput[tempTLitem.type][i]
          if (tempTLitem.qid == checkOutput.qid){
            foundLib = true
            // take lowest date
            if (tempTLitem.date < checkOutput.date) checkOutput.date = tempTLitem.date
            // loop through contribution
            if (!checkOutput.contribution.includes(tempTLitem.contribution[0])){
              // console.log('added contrib to ', tempTLitem.qid)
              checkOutput.contribution.push(tempTLitem.contribution[0])
            }
            // loop through instance
            if (!checkOutput.instance.includes(tempTLitem.instance[0])){
              // console.log('added contrib to ', tempTLitem.qid)
              checkOutput.instance.push(tempTLitem.instance[0])
            }
          }
        }
        if (!foundLib) libraryOutput[tempTLitem.type].push(tempTLitem)
      }
    }
    return libraryOutput;
  },
  processAwardData(input){
    for (var s=0; s < input.length; s++){
      var tempTLitem = _.checkAwardStatement(name, input[s])
      if (tempTLitem){
        var foundLib = false
        for (var i = 0; i < awardOutput.length && !foundLib; i++) {
          var checkOutput = awardOutput[i]
          if (tempTLitem.id == checkOutput.id ){
            foundLib = true
            // loop through conferred
            if (tempTLitem.conferred.length && !checkOutput.conferred.includes(tempTLitem.conferred[0])){
              checkOutput.conferred.push(tempTLitem.conferred[0])
            }
            // Check Date
            if (!checkOutput.date) checkOutput.date = tempTLitem.date;
            // Change type if the current is otherContent
            if (tempTLitem.type != checkOutput.type && checkOutput.type == 'other' ){
              checkOutput.type = tempTLitem.type
            }
          }
        }
        if (!foundLib) {
          tempTLitem.color_light = randomColor({luminosity: 'light'})
          tempTLitem.color_dark = randomColor({luminosity: 'dark', hue: tempTLitem.color_light})
          awardOutput.push(tempTLitem)
        }
      }
    }
  },
  getWikiCreationDates(qid, wikipedia_name, callback){
    let url_params = '?action=query&prop=revisions&rvlimit=1&rvprop=timestamp&rvdir=newer&format=json&titles='
    let wikidataUrl = 'https://www.wikidata.org/w/api.php'+url_params+qid;
    return appFetch(wikidataUrl).then((wdresponse) => {
      let wikidata_date = _._parseWikimediaAPIRevision(wdresponse);
      let wikipediaUrl = 'https://en.wikipedia.org/w/api.php'+url_params+wikipedia_name;
      return appFetch(encodeURI(wikipediaUrl)).then((wpresponse) => {
        let wikipedia_date = _._parseWikimediaAPIRevision(wpresponse);
        return callback(wikidata_date, wikipedia_date);
      })
    })
  },
  _parseWikimediaAPIRevision(response){
    try {
      return Object.values(response.query.pages)[0].revisions[0].timestamp;
    }
    catch(err) {
      return null;
    }
  },
  getTimelineData(name, wdData, inverseData, wikidata_date, wikipedia_date, ss_date){
    let timelineOutput = [];
    let timelineMap = {};
    if (wikidata_date){
      timelineOutput.push({
          date: wikidata_date,
          title: name + " Gets Added To Wikidata",
          image: "https://upload.wikimedia.org/wikipedia/commons/6/66/Wikidata-logo-en.svg"
      })
    }
    if (wikipedia_date){
      timelineOutput.push({
          date: wikipedia_date,
          title: name + " Gets Added To English Wikipedia",
          image: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Wikipedia-logo-v2-en.svg"
      })
    }
    if (ss_date){
      timelineOutput.push({
          date: ss_date,
          title: name + " Gets a Science Story",
          image: "/static/images/branding/logo_black.png"
      })
    }
    _.processTimelineData(timelineMap, timelineOutput, wdData);
    _.processTimelineData(timelineMap, timelineOutput, inverseData, true);
    return timelineOutput;
  },
  getLibraryData(name, inverseData, callback){
    let libraryOutput = _.processLibraryData(inverseData);
    for (let val in libraryOutput) {
      if (libraryOutput[val].length) return callback(libraryOutput);
    }
    return callback(false)
  },
  getAwardData(name, wdData, callback){
    awardOutput = []
    _.processAwardData(wdData)
    // awardOutput = {'new': awardOutput, 'wd':wdData }

    return callback(awardOutput)
  },

  wdCoordinatesToArray(point){
    // Example: Point(-77.070795 38.876806)"
    var temp =  JSON.parse( point.substr(point.indexOf('Point'), point.length).substr(5).replace(' ', ',').replace(/\(/g, "[").replace(/\)/g, "]"));
    return [temp[1], temp[0]]
  },
  getYears(birthVal, deathVal){
    if(birthVal){
      let year_string = parseInt(birthVal.substring(0,4), 10) + '-';
      if(deathVal) year_string += parseInt(deathVal.substring(0,4), 10);
      return year_string;
    }
    return null;
  },
  checkPeopleStatement(name, statement, inverse = false){
    if (statement.person){
      let tempval = {
        qid: getValue(statement.person),
        pid: getValue(statement.ps),
        title: getValue(statement.personLabel),
        description: getValue(statement.personDescription),
        relation: false,
        image: getValue(statement.personImg),
        qualifier: false,
        years: _.getYears(
                  getValue(statement.personBirth),
                  getValue(statement.personDeath)),
        inverse: inverse
      }
      let person_prop = getValue(statement.personPropLabel);
      let relation_prop = getValue(statement.ps);
      if (relation_prop == "http://www.wikidata.org/prop/statement/P50"){
        let person_prop = getValue(statement.personPropLabel);
        if (person_prop == 'author'){
          tempval.relation = "Co-Author";
        }
      }
      else if (relation_prop == "http://www.wikidata.org/prop/statement/P1029"){
        if (person_prop == 'crew member'){
          tempval.relation = "Crew Member";
          if (inverse && statement.ps_Label){
            tempval.relation += " ("+getValue(statement.ps_Label)+")";
          }
        }
      }
      else if (relation_prop == "http://www.wikidata.org/prop/statement/P112"){
        if (person_prop == 'founded by'){
          tempval.relation = `${tempval.title} co-founded "${getValue(statement.ps_Label)}" with ${name}`;
        }
        else {
          tempval.relation = `${name} founded "${getValue(statement.ps_Label)}" \n ${person_prop}: ${tempval.title}`;
        }
      }
      return tempval;
    }
    if (getValue(statement.objInstance) == "http://www.wikidata.org/entity/Q5"){
      var tempval = {
        qid: statement.ps_.value,
        pid: statement.ps.value,
        title: statement.ps_Label.value,
        description: false,
        relation: false,
        image: false,
        qualifier: false,
        years: _.getYears(
                  getValue(statement.objBirth),
                  getValue(statement.objDeath)),
        inverse: inverse
      }
      if(statement.img && statement.img.value){
        tempval.image = statement.img.value
      }
      if (statement.ps_Label && statement.ps_Label.value) {
        if (inverse) tempval.relation = statement.wdLabel.value + ": "+name
        else tempval.relation = statement.wdLabel.value
      }
      if(statement.ps_Description && statement.ps_Description.value){
        tempval.description = statement.ps_Description.value
      }
      if (statement.wdpqLabel && statement.pq_Label){
        if (inverse) tempval.qualifier = statement.wdpqLabel.value + " (for "+tempval.title+"): " + statement.pq_Label.value
        else tempval.qualifier = statement.wdpqLabel.value + ': ' + statement.pq_Label.value
      }
      return tempval;
    }
    return false;
  },
  checkMapStatement(name, statement, inverse = false){
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      title: false,
      image: false,
      locationImage: false,
      coordinates: false,
      location: false,
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value
    }
    if(statement.img && statement.img.value){
      tempval.image = statement.img.value
    }
    if(statement.locationImage && statement.locationImage.value){
      tempval.locationImage = statement.locationImage.value
    }
    if (statement.locationLabel && statement.locationLabel.value) {
      tempval.location = statement.locationLabel.value
    }
    if (statement.ps_Label && statement.ps_Label.value) {
      tempval.location = statement.ps_Label.value
    }

    if (statement.location){
      // Check if birth place
      if (statement.ps.value == "http://www.wikidata.org/prop/statement/P19"){
        tempval.title = name+" was born"
        if (statement.ps_Label.value) {
          tempval.title += " in " +statement.ps_Label.value
        }
        tempval.coordinates = _.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      // Check if death place
      if (statement.ps.value == "http://www.wikidata.org/prop/statement/P20"){
        tempval.title = name+" died"
        if (statement.ps_Label.value) {
          tempval.title += " in " +statement.ps_Label.value
        }
        tempval.coordinates = _.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      else{
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
        if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
        tempval.coordinates = _.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
    }
    else if (statement.objLocation){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
      tempval.coordinates = _.wdCoordinatesToArray(statement.objLocation.value)
      return tempval
    }
    return false
  },
  checkEducationStatement(statement){
    if (statement.ps.value == "http://www.wikidata.org/prop/statement/P69" && statement.ps_ && statement.ps_Label && statement.ps_Label.value){
      var tempval = {
        qid : statement.ps_.value,
        title: statement.ps_Label.value,
        description: false,
        degree: false,
        year: false,
        image: false,
        website: false,
        logo: false,
      }
      if(statement.ps_Description && statement.ps_Description.value){
        tempval.description = statement.ps_Description.value
      }

      if(statement.img && statement.img.value){
        tempval.image = statement.img.value
      }
      if(statement.objWebsite && statement.objWebsite.value){
        tempval.website = statement.objWebsite.value
      }
      if(statement.logo && statement.logo.value){
        tempval.logo = statement.logo.value
      }
      // Degree
      if (statement.wdpq && statement.wdpq.value == "http://www.wikidata.org/entity/P512")
      {
        tempval.degree = statement.pq_Label.value
      }
      // Year
      if (statement.wdpq
        && ((statement.wdpq.value == "http://www.wikidata.org/entity/P580")
          || (statement.wdpq.value == "http://www.wikidata.org/entity/P582")
          || (statement.wdpq.value == "http://www.wikidata.org/entity/P585")))
      {
        tempval.year = parseInt(statement.pq_Label.value.substring(0,4), 10)
      }

      return tempval
    }
    else return false

  },
  checkEmployerStatement(statement){
    if (statement.ps.value == "http://www.wikidata.org/prop/statement/P108" && statement.ps_ && statement.ps_Label && statement.ps_Label.value){
      var tempval = {
        qid : statement.ps_.value,
        title: statement.ps_Label.value,
        description: false,
        location: false,
        year: false,
        image: false,
        website: false,
        logo: false,
        qual_prop: false,
        qual_value: false,
      }
      if(statement.ps_Description && statement.ps_Description.value){
        tempval.description = statement.ps_Description.value
      }

      if(statement.img && statement.img.value){
        tempval.image = statement.img.value
      }
      else if (statement.locationImage && statement.locationImage.value){
        tempval.image = statement.locationImage.value;
      }
      if(statement.objWebsite && statement.objWebsite.value){
        tempval.website = statement.objWebsite.value
      }
      if(statement.logo && statement.logo.value){
        tempval.logo = statement.logo.value
      }
      if (statement.objLocationEntityLabel){
        tempval.location = statement.objLocationEntityLabel.value;
      }
      if (statement.wdpqLabel){
        if (statement.pq_Label){
          tempval.qual_prop = statement.wdpqLabel.value;
          tempval.qual_value = statement.pq_Label.value;
        } else if (statement.pq_) {
          tempval.qual_label = statement.wdpqLabel.value;
          tempval.qual_value = statement.pq_.value;
        }
      }
      // Year
      if (statement.wdpq
        && ((statement.wdpq.value == "http://www.wikidata.org/entity/P580")
          || (statement.wdpq.value == "http://www.wikidata.org/entity/P582")
          || (statement.wdpq.value == "http://www.wikidata.org/entity/P585")))
      {
        tempval.year = parseInt(statement.pq_Label.value.substring(0,4), 10)
      }

      return tempval
    }
    else return false

  },
  checkTimelineStatement(name, statement, inverse=false){

    // Skip Author Statements (Data is recoreded in the library)
    if (getValue(statement.wdLabel) == "author"){
      return false;
    }
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      date: false,
      title: false,
      image: getValue(statement.img)
    }
    let statement_prop = getValue(statement.ps);
    let statement_val = getValue(statement.ps_);
    let statement_type = getValue(statement.datatype);
    let qual_prop = getValue(statement.wdpq);

    if (statement_type == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement_val;
    }
    // Check if birth date
    if (statement_prop == "http://www.wikidata.org/prop/statement/P569"){
      tempval.title = name+" is Born"
      tempval.date = statement_val;
      return tempval
    }
    // Check if death date
    else if (statement_prop == "http://www.wikidata.org/prop/statement/P570"){
      tempval.title = name+" Passes"
      tempval.date = statement_val;
      return tempval
    }
    // Start Time
    else if (qual_prop == "http://www.wikidata.org/entity/P580"){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Begins"
      if (inverse) tempval.title = statement.ps_Label.value + "- Begins ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value;
      return tempval
    }
    // End Time
    else if (qual_prop ==  "http://www.wikidata.org/entity/P582"){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Ends"
      if (inverse) tempval.title = statement.ps_Label.value + "- Ends ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value;
      return tempval
    }
    // Check if point in time
    else if (qual_prop == "http://www.wikidata.org/entity/P585"){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value
      return tempval;
    }
    // If datetime value of statement
    else if (statement_type == "http://wikiba.se/ontology#Time"
      || statement.ps_.datatype ==  "http://www.w3.org/2001/XMLSchema#dateTime"){
      tempval.title = statement.wdLabel.value;
      if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")";
      tempval.date = statement.ps_Label.value;
      return tempval;
    }
    // If datetime value of statement
    else if (statement.objDate){
      tempval.title = statement.wdLabel.value;
      if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.objDate.value;
      return tempval;
    }
    return false;
  },
  checkLibraryStatement(name, statement){
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      contribution: [],
      date: false,
      title: false,
      type: 'other',
      instance: [],
      url: false,
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value;
      tempval.url = tempval.qid;
    }
    if (statement.objDate){
      tempval.date =  parseInt(statement.objDate.value.substring(0,4), 10)
    }
    if (statement.objInstanceLabel){
      tempval.instance = [statement.objInstanceLabel.value]
    }
    if (statement.website) {
      tempval.url = statement.website.value;
    }
    if (statement.full_work) {
      tempval.url = statement.full_work.value;
    }
    if (statement.handle) {
      tempval.url = 'http://hdl.handle.net/'+statement.handle.value;
    }
    if (statement.doi) {
      tempval.url = 'https://doi.org/'+statement.doi.value;
    }
    if (statement.wdLabel){
      tempval.contribution = [statement.wdLabel.value]
    }
    if (statement.ps_Label){
      tempval.title = statement.ps_Label.value
    }

    if (statement.objInstance){
      // Check if Scholarly article, conference paper, article
      if ((statement.objInstance.value == "http://www.wikidata.org/entity/Q13442814")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q23927052")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q191067")){
        tempval.type = 'article'
        return tempval
      }
      // Check if book, novel, textbook
      else if ((statement.objInstance.value == "http://www.wikidata.org/entity/Q571")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q8261")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q83790")){
      tempval.type = 'book'
      return tempval
      }
      // Check if property is "author","editor", "illustrator", "designed by", "developer", "copyright owner", "founder", "creator", "attributed to", "inventor"
      else if ((tempval.pid == "http://www.wikidata.org/prop/statement/P50")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P98")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P110")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P287")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P178")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P3931")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P112")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P170")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P1773")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P61")
      ){
        tempval.type = 'other'
        return tempval
      }
    }
    return false
  },
  checkAwardStatement(name, statement){
    var tempval = {
      id: getValue(statement.statement),
      qid : false,
      pid : statement.ps.value,
      conferred: [],
      date: false,
      title: false,
      type: 'other',
      description: false,
      instance: false,
      action: false
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value
    }
    if (statement.objInstanceLabel){
      tempval.instance = statement.objInstanceLabel.value
    }
    let qual_prop = getValue(statement.wdpq);
    // Check if point in time
    if (qual_prop == "http://www.wikidata.org/entity/P585"){
      tempval.date =  parseInt(statement.pq_Label.value.substring(0,4), 10)
    }
    if (statement.ps_Label){
      tempval.title = statement.ps_Label.value.toLowerCase()
    }
    if (statement.conferredLabel){
      tempval.conferred = [statement.conferredLabel.value]
    }
    if (qual_prop == "http://www.wikidata.org/entity/P1027"){
      tempval.conferred.push(getValue(statement.pq_Label))
    }
    if (statement.ps_Description){
      tempval.description = statement.ps_Description.value
    }
    //If a property related to winning an award
    if (wikidataMap.properties.awards.includes(tempval.pid.substr(39))){
      tempval.action = statement.wdLabel.value
      if (!statement.objInstance) statement.objInstance = {value: false}
      // Check if medal
      if ( (tempval.title.includes('medal')) || statement.objInstance.value == "http://www.wikidata.org/entity/Q131647"){
        tempval.type = 'medal'
      }
      // Check if Certificate
      else if ((tempval.title.includes('certificate')) || statement.objInstance.value == "http://www.wikidata.org/entity/Q196756"){
        tempval.type = 'certificate'
      }
      // Check if Trophy
      else if ((tempval.title.includes('trophy')) ||statement.objInstance.value == "http://www.wikidata.org/entity/Q381165"){
        tempval.type = 'trophy'
      }
      else if ((tempval.title.includes('hall of fame')) || statement.objInstance.value == "http://www.wikidata.org/entity/Q1046088"){
        tempval.type = 'hall'
      }
      else if (((tempval.title.includes('honor') || tempval.title.includes('honour'))&& tempval.title.includes('docto'))
      || statement.objInstance.value == "http://www.wikidata.org/entity/Q11415564"){
        tempval.type = 'edu'
      }
      // Check if award
      else if ((tempval.title.includes('award')) || statement.objInstance.value == "http://www.wikidata.org/entity/Q618779"){
        tempval.type = 'award'
      }
      return tempval
    }
    return false
  }
};
