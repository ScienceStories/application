import * as actionTypes from "./actions/types";
const initialState = {
  storiesAPIInfo: null,
};

const updateObject = (oldObject, updatedProperties) => {
    return {
        ...oldObject,
        ...updatedProperties
    };
};


const reducer = (state = initialState, action) => {
  switch (action.type) {
    case actionTypes.GET_STORIES_API_INFO:
      return updateObject(state, action);
    default:
      return state;
  }
};

export default reducer;
