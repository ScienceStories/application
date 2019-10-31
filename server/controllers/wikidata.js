const wdk = require('wikidata-sdk');
const getURLPath = require('../../app').getURLPath;
const appFetch = require('../../app').appFetch;
const { BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP } = require('../constants');
const storiesAPI = require('../stories_api');
const { getValue, iterMap, JSONFile, safeOverwrite } = require('../utils');
const sparqlController = require('./sparql');
const commentController = require('./comment');
const wikicommonsController = require('./wikicommons');
const StoryActivity = require('../models').storyactivity;
const sequelize = require('../models').sequelize;
const Slide = require('./slide').Slide;
const moment = require('moment');
const randomColor = require('randomcolor');
const iconMap = JSONFile("server/controllers/iconMap.json");
const itemTypeMap = JSONFile("server/controllers/itemTypeMap.json");
const wikidataMap = JSONFile("server/controllers/wikidataMap.json");


const _ = module.exports = {
  bibliography(req, res) {
<<<<<<< HEAD
    return storiesAPI.get('bibliography', data => {
      const works = data.map(work => {
        work.icon = iterMap(work.instances, BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP)
        return work;
      });
=======
    return sparqlController.getBibliography('en', output => {
      let works = {};
      for(i=0; i < output.length; i++){
        let record = output[i];
        let qid = record.item.value;
        if (!works[qid]){
          works[qid] = record;
        }
        else if(works[qid] && works[qid].author && works[qid].author.indexOf(record.author) == -1 ) {
          works[qid].author += ' | ' + record.author;
        }
      }
>>>>>>> origin/ss-2.0
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
  processStory(req, res, row) {
    // TODO: Old empty records stored data as a {}, we need to migrate
    // all story.data to array/list
    let isPreview = (req.url.indexOf('/preview') > -1);
    let jsonData = (Array.isArray(row.data)) ? row.data : [];
    const qid = 'Q'+req.params.id;
    const url = sparqlController.getStoryClaims(qid);
    appFetch(url).then(itemStatements => {
      itemStatements = _.simplifySparqlFetch(itemStatements)
      let storyImage = _.getMainStoryImage(row.data, itemStatements);
      var inverseUrl = sparqlController.getInverseClaims(qid, 'en')
      appFetch(inverseUrl).then(inverseClaimsOutput => {
        inverseStatements = _.simplifySparqlFetch(inverseClaimsOutput);
        let labelURL = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=labels|sitelinks&sitefilter=enwiki&languages=en`
        appFetch(labelURL).then(labels => {
          name = labels.entities[qid].labels.en.value;
          meta = {};
          meta.description = `Visually learn about ${name}. View the ${name} Science Story that compiles the multimedia (images, videos, pictures, works, etc.) found throughout the web and enriches their content using Wikimedia via Wikidata, Wikipedia, and Commons alongside YouTube Videos, IIIF Manifests, Library Archives and more.`
          wikipedia = '';
          if (labels.entities[qid].sitelinks.enwiki){
            wikipedia = labels.entities[qid].sitelinks.enwiki.title;
          }
          let wikidataManifestData = _.getWikidataManifestData(name, itemStatements, inverseStatements);
          return _.getWikiCreationDates(qid, wikipedia, (wikidata_date, wikipedia_date) => {
            let additional_data = {
              qid: qid,
              wikipedia_url: wikipedia,
              wikidata_date: wikidata_date,
              wikipedia_date: wikipedia_date,
              science_stories_date: (row.createdAt) ? row.createdAt.toISOString() : null,
              commons_category: _.getCommonsCategory(req, qid, itemStatements),
              row: row,
              user: req.session.user
            }
            jsonData = jsonData.concat(wikidataManifestData);
            jsonData = new Slide(name, additional_data)
              .getDynamicSlides(jsonData, itemStatements, inverseStatements);
            let storyRenderData = {
              page: function(){ return 'story'},
              scripts: function(){ return 'story_scripts'},
              links: function(){ return 'story_links'},
              title: name +" - Story",
              nav: "Story",
              urlPath: getURLPath(req),
              name: name,
              qid: qid,
              image: storyImage,
              row: row,
              isPreview: isPreview,
              meta: meta,
              user: req.session.user,
              data: jsonData,
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
    for (let i = 0; i < storyData.length; i++) {
      if (storyData[i].image){
        return storyData[i].image;
      }
    }
    let img_val = _.getStatementValueByProp(wikidata, 'P18');
    return (img_val) ? img_val : 'http://sciencestories.io/static/images/branding/logo_black.png';
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

  getWikidataManifestData(name, wdData, inverseData){
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
    return output;
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
};
