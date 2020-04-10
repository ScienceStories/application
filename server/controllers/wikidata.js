const { BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP } = require('../constants');
const StoriesAPI = require('../stories_api');
const { iterMap } = require('../utils');


const _ = module.exports = {
  bibliography(req, res) {
    return StoriesAPI.bibliography(data => {
      const works = data.items ? data.items.map(work => {
        work.icon = iterMap(work.instances, BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP)
        return work;
      }) : null;
      let pageData = {title:'Bibliography', works: works};
      return res.renderPage('base', 'bibliography', pageData);
    });
  }
};
