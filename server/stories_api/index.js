const axios = require('axios');
const STORIES_API_ENDPOINT = process.env.STORIES_API_ENDPOINT;
const STORIES_API_COLLECTION_ID = process.env.STORIES_API_COLLECTION_ID;
const STORIES_API_PUBLIC_KEY = process.env.STORIES_API_PUBLIC_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL || "http://sciencestories.io";
const RETRY_STATUS_CODE = 206;
const RETRY_WAIT_TIME = 1000;

const storyAPIRequest = axios.create({
  headers: { "Content-Type": "application/json" },
});

storyAPIRequest.interceptors.request.use(config => {
  // Parse slug with base url
  if (!config.url.startsWith("http")) {
    config.url = `${STORIES_API_ENDPOINT}/api/${config.url}`;
  }
  config.headers.Authorization = "Api-Key " + STORIES_API_PUBLIC_KEY;
  return config;
});

storyAPIRequest.interceptors.response.use(response => {
  const { config, data, status } = response;
  if (status === RETRY_STATUS_CODE && data && data.retry_url){
    const newConfig = {...config};
    newConfig.url = data.retry_url;
    newConfig.params = {};
    return sleepRequest(RETRY_WAIT_TIME, newConfig);
  }
  return response.data;
});

const sleepRequest = (milliseconds, originalRequest) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(storyAPIRequest(originalRequest)), milliseconds);
    });
};

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
  sitemap(callback, err){
    const formatterURL = `${PUBLIC_URL}/$id`;
    const queryParams = `url_formatter=${formatterURL}&representation=xml`;
    return _.collection(`sitemap?${queryParams}`, callback, err)
  },
  birthdays(callback, err){
    return _.collection("birthday", callback, err);
  },
  bibliography(callback, err){
    return _.story("science_stories/bibliography?page=0", callback, err)
  },
}
