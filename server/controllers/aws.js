
const appFetch = require('../../app').appFetch;
const loadPage = require('../../app').loadPage;
const loadError = require('../../app').loadError;
const fs = require('fs');

// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({region: 'us-east-2'});

// Create S3 service object
s3 = new AWS.S3({apiVersion: '2006-03-01'});






module.exports = {
  listBuckets(){
    // Call S3 to list current buckets
    s3.listBuckets(function(err, data) {
       if (err) {
          console.log("Error", err);
       } else {
          console.log("Bucket List", data.Buckets);
       }
    });
  },
  loadAllManifests() {
    var params = {
      Bucket: "sciencestories",
      MaxKeys: 2,
      Prefix: 'manifests/',
     };
     s3.listObjectsV2(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
       for (i =0; i< data.Contents.length;i++){
         s3.getObject({ Bucket: 'sciencestories', Key: data.Contents[i].Key }, function(err, data)
         {
             if (!err)
                 console.log('JSON DATA-->',data.Body.toString());
         });

        // console.log(data.Body.toString());
       }
     });
  },
  loadManifestList(req, res, callback){
    var params = {
      Bucket: "sciencestories",
      Prefix: 'manifests/',
     };
     fileList = s3.listObjectsV2(params, function(err, data) {
       // console.log(data)
       var files = []
       var items = data.Contents
       for (i=0; i < items.length; i++){
         if (items[i].Size > 0){
           files.push(items[i].Key)
         }
       }
       callback(files);
     })
  },
  loadManifestList(req, res, callback){
    var params = {
      Bucket: "sciencestories",
      Prefix: 'manifests/',
     };
     fileList = s3.listObjectsV2(params, function(err, data) {
       // console.log(data)
       var files = []
       var items = data.Contents
       for (i=0; i < items.length; i++){
         if (items[i].Size > 0){
           files.push(items[i].Key)
         }
       }
       callback(s3, files);
     })
  },
  sendManifest(req, res) {
    var params = {
      Bucket: "sciencestories",
      Key: 'manifests/'+req.params.filename,
     };
     s3.getObject(params, function(err, data)
     {
         if (!err) res.status(200).send(JSON.parse(data.Body.toString()))
         else loadError(req, res, 'Could Not Find Manifest')

     });
  },

};
