const axios = require('axios');
const STORIES_API_URL = process.env.STORIES_API_URL;
const STORIES_API_CLIENT_NAME = process.env.STORIES_API_CLIENT_NAME;
const storyAPIRequest = axios.create();

storyAPIRequest.interceptors.request.use(config => {
  // Parse slug with base url
  config.url = `${STORIES_API_URL}/api/story/${STORIES_API_CLIENT_NAME}/${config.url}`;
  return config;
});

storyAPIRequest.interceptors.response.use(response => {
  return response.data;
});
module.exports = {
  get(slug, callback, err){
    return storyAPIRequest.get(slug)
    .then(data => {
      return callback(data);
    }, error => {
      console.log(error);
      return err(error);
    })
  }
}
