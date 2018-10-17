
const appFetch = require('../../app').appFetch;
const loadPage = require('../../app').loadPage;
const loadError = require('../../app').loadError;
const fs = require('fs');
const Member = require('../models').member;

const multer  = require('multer')
const crypto = require('crypto')
const path = require('path');
const multerS3 = require('multer-s3')
// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({region: 'us-east-2'});

// Create S3 service object
s3 = new AWS.S3({apiVersion: '2006-03-01'});
UPLOAD_FILE_PREFIX = {
  'avatar': 'upload/avatar/',
  'general': 'upload/',
  'manifest': 'manifests/'

}
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'sciencestories',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, callback) {
      var file_string = req.body.filename.trim().replace(/ /g,"_") + path.extname(file.originalname)
      return Member.findById(req.session.user.id)
      .then(member => {
        newFilename = UPLOAD_FILE_PREFIX[req.body.filetype]
        if (req.body.filetype != 'manifest') newFilename += member.username+'/'
        newFilename += file_string
        callback(null, newFilename);
      })
    },
  })
})

fileUpload = upload.single('webform')

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
     }).on('error', error => {
     // Catching NoSuchKey & StreamContentLengthMismatch
     return loadError(req, res, 'Could Not Find Manifest')
     });
  },
  loadFile(req, res){
    var params = {
      Bucket: "sciencestories",
      Key:req.url.substring(1),
     };
     errorFound = false
    var filestream = s3.getObject(params).createReadStream().on('error', error => {
    // Catching NoSuchKey & StreamContentLengthMismatch
    loadError(req, res, 'Could Not Find File')
    errorFound = true
    });
    if(errorFound){
      return false
    }
    else{
      return filestream.pipe(res);
    }

  },
  upload(req, res){
    return Member.findById(req.session.user.id)
    .then(member => {
      data = {user:member}
      return loadPage(res, req, 'base', {file_id:'upload',  title:'File Upload', nav:'upload', data:data})

      })
  },

  saveUpload(req, res){
    fileUpload(req, res, function(err) {
        // console.log(req.body) // form fields
        // console.log(req.files) // form files
        res.status(204).send(req.body.filename).end()
    });

  },

};
