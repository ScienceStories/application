import React, { useState } from 'react';
import { Button, Grid, makeStyles, Typography } from '@material-ui/core';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { useLocation } from "react-router-dom";
import { StoriesAPICollection } from 'react-stories-api';

import { logo, keywords, siteDescription } from "../../../constants";
import { getStoriesAPIInfo } from '../../../redux/actions';


const useStyles = makeStyles(theme => ({
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

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const BrowsePage = (props) => {
  const classes = useStyles();
  const { storiesAPIInfo } = props;
  const [initialized, setInitialized] = useState(false); // ensure a refresh
  const [loading, isLoading] = useState(false);
  const [collection, setCollection] = useState({});
  const query = useQuery();
  if (!initialized && !loading) {
    isLoading(true);
    props.getStoriesAPIInfo((info) => {
      setInitialized(true);
      isLoading(false);
    })
  };

  const updateHistory = ({page, q}) => {
    if (window.history.pushState) {
        const newurl = window.location.protocol +
        "//" + window.location.host + window.location.pathname
        + `?page=${page}&q=${q || ''}`;
        window.history.replaceState({path:newurl},'',newurl);
    }
  }

  return (
    <div>
      <Helmet>
        <title>
          Browse {"🔎"} {collection.name || ""}
          | {collection.project_name || "Science Stories"}
        </title>
        <meta name="keywords" content={keywords.join(', ')} />
        <meta name="description" content={siteDescription} />
      </Helmet>
      <section className={classes.collectionPageHeader}>
        <div className={classes.collectionPageHeaderOverlay}>
          <Typography variant="h2" className={classes.collectionPageTitle}>
            Browse Stories
          </Typography>
        </div>
      </section>
      <div className={classes.collectionContainer}>
      {!loading && initialized && (
        <StoriesAPICollection
          apiKey={storiesAPIInfo.apiKey}
          id={storiesAPIInfo.collectionId}
          endpoint={storiesAPIInfo.endpoint}
          onLoad={setCollection}
          onChange={updateHistory}
          page={query.get("page")}
          q={query.get("q")}
        />
      )}
      </div>
      <Footer />
    </div>
  );
}


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


const mapStateToProps = state => state;

export default connect(mapStateToProps, { getStoriesAPIInfo })(BrowsePage);
