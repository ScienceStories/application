import React, { Fragment, useState } from 'react';
import { Button } from '@material-ui/core';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { useLocation } from "react-router-dom";
import StoriesAPIStory from 'react-stories-api';

import { logo, keywords } from "../../../constants";
import { getStoriesAPIInfo } from '../../../redux/actions';

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const buildDescription = ({label, description}) => (`
  Visually learn about ${label}, ${description}.
  View the ${label} Science Story that compiles the multimedia
  (images, videos, pictures, works, etc.) found throughout the web and
  enriches their content using Wikimedia via Wikidata, Wikipedia,
  and Commons alongside YouTube Videos, IIIF Manifests, Library Archives
  and more.`
);

const StoryPage = (props) => {
  const { storiesAPIInfo } = props;
  const [initialized, setInitialized] = useState(false); // ensure a refresh
  const [loading, isLoading] = useState(false);
  const [story, setStoryData] = useState({label: ""});
  const qid = "Q"+props.match.params.storyId;
  if (!initialized && !loading) {
    isLoading(true);
    props.getStoriesAPIInfo((info) => {
      setInitialized(true);
      isLoading(false);
    })
  };
  const query = useQuery();
  const updateHistory = (moment) => {
    if (window.history.pushState) {
        const newurl = window.location.protocol +
        "//" + window.location.host + window.location.pathname
        + `?moment=${moment}`;
        window.history.replaceState({path:newurl},'',newurl);
    }
  };
  const { endpoint, collectionId, apiKey } = storiesAPIInfo;
  const storyKeywords = story.keywords ? (
    story.keywords.join(', ')
  ) : story.label;
  
  const editURL = `${endpoint}/publisher/collection/${collectionId}/builder/custom/${qid}`;
  const renderEditButton = () => (
    <Button href={editURL} style={{opacity: 0, color: "white"}}>
      Edit Story
    </Button>
  )

  return !loading && initialized && (
    <Fragment>
      <Helmet>
        <title>
          {story.label || `🔄 Loading Story ${qid}...`} | Science Stories
        </title>
        <meta name="keywords" content={keywords.join(', ')+", "+storyKeywords}/>
        <meta name="description" content={buildDescription(story)} />
      </Helmet>
      <StoriesAPIStory
        apiKey={apiKey}
        id={qid}
        collection={collectionId}
        endpoint={endpoint}
        options={{
          logo: (
            <Fragment>
              <Button href="/">
                <img
                  alt="Science Stories Logo"
                  src={logo}
                  style={{width: "100%"}}
                />
              </Button>
              {renderEditButton()}
            </Fragment>
          ),
          active: parseInt(query.get("moment") || 0),
          onChange: updateHistory
        }}
        onLoad={setStoryData}
      />
    </Fragment>
  );
};


const mapStateToProps = state => state;

export default connect(mapStateToProps, { getStoriesAPIInfo })(StoryPage);
