const Story = require('../models').story;
const wikidataController = require('./wikidata');
const JSONFile = require('../utils').JSONFile;
const faq = JSONFile("server/constants/faq.json");
const featuredStories = JSONFile("server/controllers/featuredStories.json");
const StoriesAPI = require('../stories_api');


const _ = module.exports = {
  welcome(req, res){
    return StoriesAPI.count(({count}) => {
      return StoriesAPI.birthdays((birthdays) => {
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
  storiesAPIInfo: (req, res) => res.send(StoriesAPI.info),
  dump(req,res) {
    return Story.findAll().then(stories => {
      return res.send(stories)
    })
  },
  getFeaturedList() {
    // TODO: There is a bug when an odd number of elements are in the carousel.
    // Duplicating the list is a temporary fix
    return featuredStories.concat(featuredStories);
  }
};
