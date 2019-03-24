const members = require('./member');
const story = require('./story');
const wikidata = require('./wikidata');
const wikicommons = require('./wikicommons');
const annotation = require('./annotation');
const aws = require('./aws');
const sparql = require('./sparql');
const comment = require('./comment');
const sitemap = require('./sitemap');
const google = require('./google');
module.exports = {
  members, story, wikidata, wikicommons, annotation, aws, sparql, comment,
  sitemap, google
};
