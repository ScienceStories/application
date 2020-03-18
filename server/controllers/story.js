const Story = require('../models').story;
const sparqlController = require('./sparql');
const wikidataController = require('./wikidata');
const JSONFile = require('../utils').JSONFile;
const faq =  JSONFile("server/constants/faq.json");
const featuredStories =  JSONFile("server/controllers/featuredStories.json");


const _ = module.exports = {
  welcome(req, res){
    return _.getCount(count => {
      return _._getBirthdays((birthdays) => {
        let pageData = {
          title: 'Welcome',
          story_count: count,
          meta: {description: "Science Stories brings scientific work into social spaces where users discover information about underrepresented scientists — creating starting points for further exploration. For institutions with cultural heritage resources in libraries, archives, museums and galleries that are not yet available on the web, we provide a web application that leverages Wikidata, IIIF, and semantic web technologies to demonstrate a vision of what getting scientific work products into social spaces can do."},
          featured_stories: _.getFeaturedList(),
          birthdays: birthdays,
          faq: faq
        }
        return res.renderFullPage('home', pageData);
      });
    });
  },
  getCount(callback){
    return Story.count().then(count => callback(count))
  },
  validate(req, res){
    let qid = req.params.qid;
    return _.getByQID(qid, story => {
      if (story) return res.send({valid: true, active: true});
      return wikidataController.storyValidate(qid, isValid => {
        return res.send({valid:isValid, active:false});
      });
    });
  },
  getByQID(qid, next){
    return Story.findOne({where: {qid:qid}}).then(next);
  },
  dump(req,res) {
    return Story.findAll().then(stories => {
      return res.send(stories)
    })
  },
  birthday(req, res){
    return _._getBirthdays((items) => res.send(items))
  },
  _getBirthdays(callback){
    Story.findAll({ attributes:['qid', 'data']}).then(list => {
      let qidList = [];
      let allStories = [];
      for(let i in list){
        qidList.push(list[i].dataValues.qid);
        allStories.push(list[i].dataValues);
      }
      return sparqlController.birthdayQuery(qidList, content => {
        content = _.imagesFromStory(allStories, content);
        return callback(content);
      })
    })
  },
  imagesFromStory(db_values, output){
    for (var i = 0; i < output.length; i++) {
      if(!output[i].image){
        let index = output[i].index;
        for (var k = 0; k < db_values[index].data.length; k++) {
          if (db_values[index].data[k].image){
            output[i].image = db_values[index].data[k].image;
            break;
          }
        }
      }
    }
    return output;
  },
  getFeaturedList() {
    // TODO: There is a bug when an odd number of elements are in the carousel.
    // Duplicating the list is a temporary fix
    return featuredStories.concat(featuredStories);
  }
};
