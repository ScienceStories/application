import React, { useState } from 'react';
import { Button } from '@material-ui/core';
import { connect } from 'react-redux';
import StoriesAPIStory from 'react-stories-api';

import { logo } from "../../../constants";
import { getStoriesAPIInfo } from '../../../redux/actions';


const StoryPage = (props) => {
  const { storiesAPIInfo } = props;
  const [initialized, setInitialized] = useState(false); // ensure a refresh
  const [loading, isLoading] = useState(false);
  if (!initialized && !loading) {
    isLoading(true);
    props.getStoriesAPIInfo((info) => {
      setInitialized(true);
      isLoading(false);
    })
  };

  return !loading && initialized && (
    <StoriesAPIStory
      apiKey={storiesAPIInfo.apiKey}
      id={"Q"+props.match.params.storyId}
      collection={storiesAPIInfo.collectionId}
      endpoint={storiesAPIInfo.endpoint}
      options={{logo: (
        <Button href="/">
          <img alt="Science Stories Logo" src={logo} style={{width: "100%"}}/>
        </Button>
      )}}
    />
  );
};


const mapStateToProps = state => state;

export default connect(mapStateToProps, { getStoriesAPIInfo })(StoryPage);
