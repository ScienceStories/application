import React from 'react';
import { MuiThemeProvider } from '@material-ui/core';
import { createTheme, makeStyles } from '@material-ui/core/styles';
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


export default function App(){
  const classes = useStyles();
  return (
    <BrowserRouter>
      <MuiThemeProvider theme={createTheme(theme)}>
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
