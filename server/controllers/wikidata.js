const wdk = require('wikidata-sdk');
const fetch = require('node-fetch');
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;
const loadError =  require('../../app').loadError;
const sparqlController = require('./sparql');
const commentController = require('./comment');
const StoryActivity = require('../models').storyactivity;
const sequelize = require('../models').sequelize;
const fs = require('fs');
const moment = require('moment');
iconMap =  JSON.parse(fs.readFileSync("server/controllers/iconMap.json"));
itemTypeMap =  JSON.parse(fs.readFileSync("server/controllers/itemTypeMap.json"));
module.exports = {
  bibliography(req, res) {
    var queryUrl = sparqlController.getBibliography('en')
    return appFetch(queryUrl)
      .then(output => {
        var results = output.results.bindings;
        works = []
        qidsFound = []
        for (i=0; i < results.length; i++){
          var record = results[i]
          var qid = record.item.value.replace('http://www.wikidata.org/entity/', '')
          var index = qidsFound.indexOf(qid);
          if ( index == -1){
            qidsFound.push(qid);
            newRecord = {qid:qid}
            for(var key in record) newRecord[key] = record[key].value;
            works.push(newRecord)
          }
          else if(works[index].authorLabel.indexOf(record.authorLabel.value) == -1){
            works[index].authorLabel += ' | '+record.authorLabel.value
          }
        }
         loadPage(res, req, 'base', {file_id:'bibliography', title:'Bibliography', nav:'bibliography', works: works})
      })
  },
  searchItems(req, res, string, callback){
    var search_url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${string}&language=en&format=json`
    appFetch(search_url)
      .then(content => {
        var qidList = []
        for (i=0; i < content.search.length; i++){
          qidList.push(content.search[i].id)
        }
        return callback(qidList)
      })
  },
  mergeValuesComma(){
    // TODO:
  },
  mergeValuesList(){
    // TODO:
  },
  mergeValuesFirst(qidList, rawData){
    var tempQidList = qidList.slice();
    var content = []
    for (var i=0; i<rawData.length;i++){
      var qid = rawData[i].item.value.replace('http://www.wikidata.org/entity/', '')
      var index = tempQidList.indexOf(qid);
      if (index > -1) {
        tempQidList.splice(index, 1);
        var record = rawData[i]
        var newRecord = {qid: qid}
        for(var key in record) newRecord[key] = record[key].value;
        content.push(newRecord)
      }
    }
    return content
  },
  processDetailListSection(queryFunction, output, qidSet, setIndex, callback){
    var queryUrl = queryFunction(qidSet[setIndex], 'en');
    return appFetch(queryUrl).then(sectionOutput => {
      sectionOutput = sectionOutput.results.bindings;
      for (var i = 0; i < sectionOutput.length; i++) {
        output.push(sectionOutput[i])
      }
      setIndex += 1;
      if (setIndex < qidSet.length){
        return module.exports.processDetailListSection(queryFunction, output, qidSet, setIndex, callback)
      }
      else{
        return callback(output)
      }
    })
  },
  processDetailList(req, res, queryFunction, qidList, callback, mergeType, defaultImage){
      var qidSet = [[]]
      var thisSet = 0
      var maxLength = 50
      var check = 0
      for (var i = 0; i < qidList.length; i++) {
        if (check == maxLength){
          check = 0;
          thisSet += 1;
          qidSet.push([qidList[i]])
        }
        else {
          qidSet[thisSet].push(qidList[i])
          check += 1;
        }
      }
      return module.exports.processDetailListSection(queryFunction, [], qidSet, 0, function(output){
        // rawData = output.results.bindings;
        if (!mergeType || mergeType == 'first'){
          content = module.exports.mergeValuesFirst(qidList, output)
          if (defaultImage){
            for (var i=0; i<content.length;i++){
              if (!content[i].image) content[i].image = defaultImage
            }
          }
          return callback(content)}
      })
  },
  simplifySparqlFetch(content){
    return content.results.bindings.map(function(x){
      if (x.url != null) x.url.value = x.url.value.replace('$1', x.ps_Label.value)
      return x
    })
  },
  getDetailsList(req, res, qidList, detailLevel, mergeType=false, defaultImage=false, callback){
    if (detailLevel == 'small'){
      //  label, description, optional image
      return module.exports.processDetailList(req, res, sparqlController.getSmallDetailsList, qidList, callback, mergeType, defaultImage)
    }
    else if (detailLevel == 'small_with_age'){
      // label, description, optional image
      return module.exports.processDetailList(req, res, sparqlController.getSmallDetailsListWithAge, qidList, callback, mergeType, defaultImage)
    }
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
    SELECT ?ps ?wdLabel ?wdDescription ?datatype ?ps_Label ?ps_ ?wdpqLabel  ?wdpq ?pq_Label ?url ?img ?location ?objLocation ?locationImage{
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
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?wd ?statement ?ps_
    `
    const url = wdk.sparqlQuery(sparql);
    appFetch(url).then(content => {
      output = module.exports.simplifySparqlFetch(content)
      return {qid:qid, statements: output}
    }
      ).then(simplifiedResults => {
        var inverseUrl = sparqlController.getInverseClaims(qid, 'en')
        appFetch(inverseUrl).then(inverseClaimsOutput => {
          inverseStatements = module.exports.simplifySparqlFetch(inverseClaimsOutput)
          appFetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|sitelinks&sitefilter=enwiki&languages=en`)
          .then(labels => {
            name = labels.entities[qid].labels.en.value
            meta = {}
            meta.description = `Visually learn about ${name}. View the ${name} Science Story that compiles the multimedia (images, videos, pictures, works, etc.) found throughout the web and enriches their content using Wikimedia via Wikidata, Wikipedia, and Commons alongside YouTube Videos, IIIF Manifests, and more.`
            wikipedia = ''
            if (labels.entities[qid].sitelinks.enwiki){
              wikipedia = labels.entities[qid].sitelinks.enwiki.title
            }
            return module.exports.getLibraryData(name, inverseStatements, function(libraryData){
              // return res.send(libraryData)
              return module.exports.getMapData(name, simplifiedResults.statements, inverseStatements, function(mapData){
                // return res.send(mapData)
                // ADDED Here
                return module.exports.getTimelineData(name, simplifiedResults.statements, inverseStatements, function(timelineData){
                  // FINAL CALL
                  if (req.session.user && (req.url.indexOf('/preview') == -1)) {
                    StoryActivity.findOrCreate({
                        where: {
                          memberId: req.session.user.id,
                          storyId: row.id
                        },
                      })
                    .spread((found, created) =>{
                      found.update({
                      views: found.views+1,
                      lastViewed: sequelize.fn('NOW')})
                        .then(output => {
                              return commentController.loadCommentsFromStory(row.id, function(comments){res.render('full', {

                            page: function(){ return 'story'},
                            scripts: function(){ return 'story_scripts'},
                            links: function(){ return 'story_links'},
                            title: name +" - Story",
                            nav: "Story",
                            content: simplifiedResults.statements,
                            wikipedia: wikipedia,
                            name: name,
                            qid: simplifiedResults.qid,
                            storyActivity: output.dataValues,
                            data: jsonData,
                            user: req.session.user,
                            row: row,
                            comments: comments,
                            meta: meta,
                            map: mapData,
                            library: libraryData,
                            timeline: timelineData
                          })})
                        })
                    })
                    .catch(error => {loadError(req, res, 'Something went wrong.')});
                  }
                  else return commentController.loadCommentsFromStory(row.id, function(comments){

                    res.render('full', {
                      page: function(){ return 'story'},
                      scripts: function(){ return 'story_scripts'},
                      links: function(){ return 'story_links'},
                      title: name +" - Story",
                      nav: "Story",
                      content: simplifiedResults.statements,
                      wikipedia: wikipedia,
                      name: name,
                      qid: simplifiedResults.qid,
                      data: jsonData,
                      row: row,
                      comments: comments,
                      meta: meta,
                      map: mapData,
                      library: libraryData,
                      timeline: timelineData
                    })
                  })
                })

              })
            })



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
  processMapData(input, inverse=false){
    for (var s=0; s < input.length; s++){
    var tempMapitem = module.exports.checkMapStatement(name, input[s], inverse)
    if (tempMapitem){
      if(mapOutput[tempMapitem.coordinates]) {
        var tempList = mapOutput[tempMapitem.coordinates]
        var foundmap = false
        for (var i = 0; i < mapOutput[tempMapitem.coordinates].length; i++) {

          if (mapOutput[tempMapitem.coordinates][i].title == tempMapitem.title) {
            // console.log("checking ", mapOutput[tempMapitem.coordinates][i].title, '-->', tempMapitem.title)
            foundmap = true
            i = mapOutput[tempMapitem.coordinates].length
          }
        }
        if (!foundmap) mapOutput[tempMapitem.coordinates].push(tempMapitem)
      }
      else mapOutput[tempMapitem.coordinates] = [ tempMapitem ]
    }}
  },
  getMapData(name, wdData, inverseData, callback){
    mapOutput = {}
    module.exports.processMapData(wdData)
    module.exports.processMapData(inverseData, true)

    // mapOutput = {'new': mapOutput, 'wd':wdData }
    return callback(mapOutput)
  },
  processTimelineData(input, inverse=false){
    for (var s=0; s < input.length; s++){
      var tempTLitem = module.exports.checkTimelineStatement(name, input[s], inverse)
      if (tempTLitem && (module.exports.checkDuplicateDataItem(timelineOutput, tempTLitem, ['title', 'date']) == -1)) timelineOutput.push(tempTLitem)
    }
  },
  processLibraryData(input){
    for (var s=0; s < input.length; s++){
      var tempTLitem = module.exports.checkLibraryStatement(name, input[s])
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
  },
  checkDuplicateDataItem(list, item, props=false){
    for (var i = 0; i < list.length; i++) {
      var checkItem = list[i]
      if(props){
        var allSame = true
        for (var k = 0; k < props.length && allSame; k++) {
          if (checkItem[props[k]] != item[props[k]]) allSame = false
        }
        if (allSame) return i
      }
      else if (item == checkItem) return i;
    }
    return -1
  },
  getTimelineData(name, wdData, inverseData, callback){
    timelineOutput = []
    module.exports.processTimelineData(wdData)
    module.exports.processTimelineData(inverseData, true)
    // timelineOutput = {'new': timelineOutput, 'wd':wdData }
    return callback(timelineOutput)
  },
  getLibraryData(name, inverseData, callback){
    libraryOutput = {'book': [], 'article': [], 'other': []}
    module.exports.processLibraryData(inverseData)
    // libraryOutput = {'new': libraryOutput, 'wd':inverseData }
    for (var val in libraryOutput) {
      if (libraryOutput[val].length) return callback(libraryOutput)
    }
    libraryOutput = false
    return callback(false)
  },
  wdCoordinatesToArray(point){
    // Example: Point(-77.070795 38.876806)"
    var temp =  JSON.parse( point.substr(5).replace(' ', ',').replace(/\(/g, "[").replace(/\)/g, "]"));
    return [temp[1], temp[0]]
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
        tempval.coordinates = module.exports.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      // Check if death place
      if (statement.ps.value == "http://www.wikidata.org/prop/statement/P20"){
        tempval.title = name+" died"
        if (statement.ps_Label.value) {
          tempval.title += " in " +statement.ps_Label.value
        }
        tempval.coordinates = module.exports.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      else{
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
        if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
        tempval.coordinates = module.exports.wdCoordinatesToArray(statement.location.value)
        return tempval
      }
    }
    else if (statement.objLocation){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
      tempval.coordinates = module.exports.wdCoordinatesToArray(statement.objLocation.value)
      return tempval
    }
    return false
  },
  checkTimelineStatement(name, statement, inverse=false){
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      date: false,
      title: false,
      image: false
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value
    }
    if(statement.img && statement.img.value){
      tempval.image = statement.img.value
    }
    // Check if birth date
    if (statement.ps.value == "http://www.wikidata.org/prop/statement/P569"){
      tempval.title = name+" is Born"
      tempval.date = statement.ps_.value
      return tempval
    }
    // Check if death date
    else if (statement.ps.value == "http://www.wikidata.org/prop/statement/P570"){
      tempval.title = name+" Passes"
      tempval.date = statement.ps_.value
      return tempval
    }
    // Start Time
    else if (statement.wdpq && (statement.wdpq.value == "http://www.wikidata.org/entity/P580")){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Begins"
      if (inverse) tempval.title = statement.ps_Label.value + "- Begins ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value
      // console.log(statement)
      return tempval
    }
    // End Time
    else if (statement.wdpq && (statement.wdpq.value == "http://www.wikidata.org/entity/P582")){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Ends"
      if (inverse) tempval.title = statement.ps_Label.value + "- Ends ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value
      // console.log(statement)
      return tempval
    }
    // Check if point in time
    else if (statement.wdpq && (statement.wdpq.value == "http://www.wikidata.org/entity/P585")){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.pq_Label.value
      // console.log(statement)
      return tempval
    }
    // If datetime value of statement
    else if ((statement.datatype.value == "http://wikiba.se/ontology#Time")
      || (statement.ps_.datatype ==  "http://www.w3.org/2001/XMLSchema#dateTime")){
      tempval.title = statement.wdLabel.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.ps_Label.value
      return tempval
    }
    // If datetime value of statement
    else if (statement.objDate){
      tempval.title = statement.wdLabel.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.objDate.value
      return tempval
    }
    else if (statement.objBirth){
      tempval.title = statement.wdLabel.value
      if (inverse) tempval.title = statement.ps_Label.value + " is Born ("+  statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.objBirth.value
      return tempval
    }
    else if (statement.objDeath){
      tempval.title = statement.wdLabel.value
      if (inverse) tempval.title = statement.ps_Label.value + " is Passes ("+  statement.wdLabel.value + ": "+name+")"
      tempval.date = statement.objBirth.value
      return tempval
    }
    return false
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
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value
    }
    if (statement.objDate){
      tempval.date =  parseInt(statement.objDate.value.substring(0,4), 10)
    }
    if (statement.objInstanceLabel){
      tempval.instance = [statement.objInstanceLabel.value]
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
  }
};
