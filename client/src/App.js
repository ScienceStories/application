import React from 'react';
import {
  createMuiTheme, MuiThemeProvider, makeStyles
} from '@material-ui/core';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import BrowsePage from './components/container/Browse';
import StoryPage from './components/container/Story';
import { theme } from "./constants";


const useStyles = makeStyles(theme => ({
  app: {
    textAlign: "center",
    height: "100vh",
    width: "100vw",
  }
}));


export default function App(props){
  const classes = useStyles();
  return (
    <BrowserRouter>
      <MuiThemeProvider theme={createMuiTheme(theme)}>
        <div className={classes.app}>
          <Switch>
            <Route path="/browse" component={BrowsePage} />
            <Route path="/Q:storyId" component={StoryPage} />
            <Route exact path="/"
            render={() => {
              window.location.href = "/welcome";
              return null;
            }}>
            </Route>
          </Switch>
        </div>
      </MuiThemeProvider>
    </BrowserRouter>
  );
};
