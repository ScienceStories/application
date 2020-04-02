import { createStore, applyMiddleware } from 'redux';
import thunk from "redux-thunk";

import reducer from './reducer';

const middleware = applyMiddleware(thunk);
const middlewareStore = middleware(createStore);
const loadFromLocalStorage = () => {
  try {
    const serializedState = localStorage.getItem("state");
    console.log(serializedState);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.log(err);
  }
};

export const saveToLocalStorage = state => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem("state", serializedState);
  } catch (err) {
    console.log(err);
  }
};

const persistedState = loadFromLocalStorage();
const store = middlewareStore(reducer, persistedState,
                              window.__REDUX_DEVTOOLS_EXTENSION__
                                && window.__REDUX_DEVTOOLS_EXTENSION__());

store.subscribe(() => saveToLocalStorage(store.getState()));

export default store;
