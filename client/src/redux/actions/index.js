import api from "../../apiClient";

import * as actionTypes from "./types";

export const getStoriesAPIInfo = (callback) => dispatch => {
  return api.post("/api/storiesAPIInfo")
    .then(response => {
      const storiesAPIInfo = response.data;
      console.log(storiesAPIInfo);
      dispatch({
        type: actionTypes.GET_STORIES_API_INFO,
        storiesAPIInfo: storiesAPIInfo,
      });
      callback(storiesAPIInfo);
    })
    .catch(error => {
      console.error(error);
    });
}
