const wdk = require('wikidata-sdk');
const getURLPath = require('../../app').getURLPath;
const appFetch = require('../../app').appFetch;
const { BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP } = require('../constants');
const StoriesAPI = require('../stories_api');
const { getValue, iterMap, JSONFile, safeOverwrite } = require('../utils');
const sparqlController = require('./sparql');
const StoryActivity = require('../models').storyactivity;
const sequelize = require('../models').sequelize;
const moment = require('moment');
const randomColor = require('randomcolor');
const iconMap = JSONFile("server/controllers/iconMap.json");
const itemTypeMap = JSONFile("server/controllers/itemTypeMap.json");


const _ = module.exports = {
  bibliography(req, res) {
    return StoriesAPI.get('science_stories/bibliography', data => {
      const works = data.map(work => {
        work.icon = iterMap(work.instances, BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP)
        return work;
      });
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
  _tempCovertWikicatToStoriesAPIShape(wikicatMoment){
    // Commons Category is supported by Stories-API for dynamic categories
    // Keeping this here for user submitted categories until Stories-API can
    // host/support them.
    const base_url = process.env.STORIES_API_URL.replace("https", "http");
    const manifestUri = base_url + "/api/iiif/wikimedia/commons/category/" + wikicatMoment.category;
    return {
      "type": "commons_category_iiif",
      "title": wikicatMoment.title,
      "subtitle": wikicatMoment.description,
      "icon": {
        "name": "far fa-images",
        "source": "fa"
      },
      "color": {
        "type": "hex",
        "background": wikicatMoment.color,
        "text": "#fff"
      },
      "tooltip": wikicatMoment.tooltip,
      "reference": {
        "title": "Wikimedia Commons",
        "url": "https://commons.wikimedia.org/wiki/Category:"+wikicatMoment.category,
        "description": "Online repository of free-use images, sound and other media files, part of the Wikimedia ecosystem",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Commons-logo.svg"
      },
      "manifest_uri": manifestUri,
      "url": base_url
              + "/api/iiif/viewer/universal_viewer?manifest_uri="
              + manifestUri
    }
  },
  processStory(req, res, row) {
    // TODO: Old empty records stored data as a {}, we need to migrate
    // all story.data to array/list
    let isPreview = (req.url.indexOf('/preview') > -1);
    let jsonData = (Array.isArray(row.data)) ? row.data : [];
    // Temporary step: translate wikicat to commons_category_iiif
    jsonData = jsonData.map(m => (m.type == "wikicat") ? _._tempCovertWikicatToStoriesAPIShape(m) : m)
    // return res.send(jsonData)
    const qid = 'Q'+req.params.id;
    return StoriesAPI.get(qid, story => {
      const user = req.session.user;
      const name = story.label;
      jsonData = jsonData.concat(story.moments);
      jsonData = jsonData.map(m => {
        if (m.type == "index"){
          // TODO: Temporary solution to add SS data into moment
          m.story_data = row;
          m.user = user;
        }
        return m;
      })
      const storyRenderData = {
        page: function(){ return 'story'},
        scripts: function(){ return 'story_scripts'},
        links: function(){ return 'story_links'},
        title: name +" - Story",
        nav: "Story",
        urlPath: getURLPath(req),
        name,
        qid,
        image: _.getMainStoryImage(row.data, story.images),
        row,
        isPreview,
        meta: {
          description: `Visually learn about ${name}. View the ${name} Science Story that compiles the multimedia (images, videos, pictures, works, etc.) found throughout the web and enriches their content using Wikimedia via Wikidata, Wikipedia, and Commons alongside YouTube Videos, IIIF Manifests, Library Archives and more.`
        },
        user,
        data: jsonData,
      }
      if (user && !isPreview) {
        return StoryActivity
        .findOrCreate({where: {
          memberId: user.id,
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
  },
  getMainStoryImage(storyData, images){
    for (let i = 0; i < storyData.length; i++) {
      if (storyData[i].image){
        return storyData[i].image;
      }
    }
    for (let i = 0; i < images.length; i++) return images[i];
    return 'http://sciencestories.io/static/images/branding/logo_black.png';
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

};
