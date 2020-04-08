const axios = require('axios');
const STORIES_API_ENDPOINT = process.env.STORIES_API_ENDPOINT;
const STORIES_API_COLLECTION_ID = process.env.STORIES_API_COLLECTION_ID;
const STORIES_API_PUBLIC_KEY = process.env.STORIES_API_PUBLIC_KEY;
const storyAPIRequest = axios.create();

storyAPIRequest.interceptors.request.use(config => {
  config.headers.Authorization = "Api-Key " + STORIES_API_PUBLIC_KEY;
  // Parse slug with base url
  config.url = `${STORIES_API_ENDPOINT}/api/${config.url}`;
  return config;
});

storyAPIRequest.interceptors.response.use(response => {
  return response.data;
});
const _ = module.exports = {
  info: {
    apiKey: STORIES_API_PUBLIC_KEY,
    collectionId: STORIES_API_COLLECTION_ID,
    endpoint: STORIES_API_ENDPOINT,
  },
  get(slug, callback, err){
    return storyAPIRequest.get(slug)
    .then(data => {
      return callback(data);
    }, error => {
      return err && err(error);
    })
  },
  collection(slug, callback, err){
    return _.get(`collection/${STORIES_API_COLLECTION_ID}/${slug}`,
      callback, err);
  },
  story(slug, callback, err){
    return _.get(`story/${slug}`,
      callback, err);
  },
  count(callback, err){
    return _.story(`count?collection=${STORIES_API_COLLECTION_ID}`, callback,
      err)
  },
  birthdays(callback, err){
    return _.collection("birthday", callback, err);
  },
  bibliography(callback, err){
    return _.story("science_stories/bibliography", callback, err)
  },
}
