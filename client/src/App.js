import React from 'react';
import {
  Button, createMuiTheme, Grid, MuiThemeProvider, makeStyles, Typography
} from '@material-ui/core';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import StoriesAPIStory, { StoriesAPICollection } from 'react-stories-api';

import {
  affiliationLogos, logo, projectUrl, storiesAPICollectionId,
  storiesAPIEndpoint, storiesAPIKey, theme,
} from "./constants";


const useStyles = makeStyles(theme => ({
  app: {
    textAlign: "center",
    height: "100vh",
    width: "100vw",
  },
  footer: {
    background: theme.palette.background.paper,
    position: "fixed",
    bottom: 0,
    width: "100%",
    boxShadow: theme.shadows[4],
  },
  button: {

    color: theme.palette.background.default,
  },
  container: {
    width: "100%",
  },
  footerLogo:{
    maxHeight: theme.typography.h3.fontSize,
    maxWidth: "100%",
  },
  light:{
    opacity: .5,
    padding: theme.spacing(1)
  },
  collectionPageHeader: {
    width: "100%",
    backgroundImage: "url(https://images.unsplash.com/photo-1512567100135-223e140cd167?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=8da2d287529b3ca7bd2dd0c9ba462db0&auto=format&fit=crop&w=1950&q=80)",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover"
  },
  collectionPageHeaderOverlay: {
    width: "100%",
    background: "#3cffe799",
    textAlign: 'right'
  },
  collectionPageTitle: {
    color: "white",
    textShadow: "1px 2px 6px black",
    fontWeight: "bold",
    padding: theme.spacing(5),
    paddingTop: "20vh",
  },
  collectionContainer: {
    width: "100%",
    paddingTop: 100,
    paddingBottom: 100,
    boxShadow: "0px -10px 9px 7px #00000075",
  }
}));


const CollectionPage = () => {
  const classes = useStyles();
  return (
    <div>
      <section className={classes.collectionPageHeader}>
        <div className={classes.collectionPageHeaderOverlay}>
          <Typography variant="h2" className={classes.collectionPageTitle}>
            Browse Stories
          </Typography>
        </div>
      </section>
      <div className={classes.collectionContainer}>
        <StoriesAPICollection
          apiKey={storiesAPIKey}
          id={storiesAPICollectionId}
          endpoint={storiesAPIEndpoint}
        />
      </div>
      <Footer />
    </div>
  );
}

const StoryPage = (props) => (
  <StoriesAPIStory
    apiKey={storiesAPIKey}
    id={"Q"+props.match.params.storyId}
    collection={storiesAPICollectionId}
    endpoint={storiesAPIEndpoint}
    options={{logo: (
      <Button href="/">
        <img alt="Science Stories Logo" src={logo} style={{width: "100%"}}/>
      </Button>
    )}}
  />
)

const Footer = (props) => {
  const classes = useStyles();

  return (
    <footer className={classes.footer}>
      <Grid
        container
        className={classes.container}
        justify="center"
        alignItems="center"
      >
        <Grid item xs={3} className={classes.light}>
          <Typography variant="caption">
            <Button size="small" color="primary" href="/donate">
               Support Our Initiative
            </Button>
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Button className={classes.button} href="/">
            <img
              className={classes.footerLogo}
              alt="Science Stories Logo"
              src={logo}
            />
          </Button>
        </Grid>
        <Grid item className={classes.light}>
          <Typography variant="caption">
            &copy; {1900 + new Date().getYear()} ,
            Create Your Own Site with
            <Button
              size="small"
              color="primary"
              href="https://stories.k2.services"
              target="_blank"
              >
               The Story Service
            </Button>
          </Typography>
        </Grid>
      </Grid>
    </footer>
  );
};

export default function App() {
  const classes = useStyles();
  return (
    <BrowserRouter>
      <MuiThemeProvider theme={createMuiTheme(theme)}>
        <div className={classes.app}>
          <Switch>
            <Route path="/browse" component={CollectionPage} />
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
