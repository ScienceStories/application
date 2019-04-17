const Annotation = require('../models').annotation;
const appFetch = require('../../app').appFetch;
const Sequelize = require('sequelize');
const fs = require('fs');
const awsController = require('./aws');

module.exports = {

  showPage(req, res) {
    let pageData = {title:'Annotate Manifests'};
    if (req.query.manifest){
      pageData.data = {uriList:[], cutom: req.query.manifest};
      return res.renderPage('base', 'annotate', pageData);
    }
    return awsController.loadManifestList(req, res, (s3, files) => {
      let annoIds = [];
      for (f=0; f < files.length; f++){
        s3.getObject({Bucket: "sciencestories", Key: files[f]}, (err, data) => {
          if (!err) {
            let sequences = JSON.parse(data.Body.toString()).sequences;
            for (seqNum = 0; seqNum < sequences.length; seqNum++){
              let canvases = sequences[seqNum].canvases;
              for (canNum = 0; canNum < canvases.length; canNum++){
                annoIds.push(canvases[canNum]['@id']);
              }
            }
          }
        });
        files[f] = files[f].replace('manifests/', '')
      }
      pageData.data = {files:files, uriList:annoIds};
      return res.renderPage('base', 'annotate',  pageData)
    });
  },
  create(data) {
    return Annotation
      .create({
        uri: data.uri,
        status: 'active',
        state: data[data.uri],
        memberId: 1
      })
      .catch(error => {return 0});
  },
  select(req, res) {
    return Annotation.findOne({where: {qid: 'Q'+req.params.id, status: 'basic'}})
      .then(out => {
        if (out) {
          return wikidataController.processAnnotation(req, res, out);
        }
        return res.renderError('This annotation has not yet been curated.');
      }).catch(error => res.renderError('Trouble Loading this Annotation'));
  },
  loadFromUri(req, res, next=null, uriArray=false) {
    uriArray = (uriArray) ? uriArray : req.body.uri;
    sendData = {};
    return Annotation.findAll({where: {uri:uriArray}}).then(out => {
      for (anno in out){
        sendData[out[anno].uri] = out[anno].state;
      }
      res.status(200).send(sendData);
    })
  },
  loadFromManifest(req, res, next=null, manifestUri=false) {
    manifestUri = (manifestUri) ? manifestUri : req.body.uri;
    return appFetch(manifestUri).then(content => {
      lst = module.exports.getUriListFromManifest(content);
      return module.exports.loadFromUri(req, res, null, lst);
    })
   },
  getUriListFromManifest(manifestObj){
    var output = []
    var sequences = manifestObj.sequences
    for (seqNum = 0; seqNum < sequences.length; seqNum++){
      var canvases = sequences[seqNum].canvases
      for (canNum = 0; canNum < canvases.length; canNum++){
        output.push(canvases[canNum]['@id'])
      }
    }
    return output;
  },
  loadAll(req, res) {
    sendData = {};
    return Annotation
      .all()
      .then(out => {
        for (anno in out){
          sendData[out[anno].uri] = out[anno].state;
        }
        res.status(200).send(sendData);
      })
  },
  update(data) {
    return Annotation.findOne({where: {uri: data.uri}}).then(found => {
        if (!found){
          return 0;
        }
        return found.update(data, {fields: Object.keys(data)}).then(() => {})
          .catch(error => {return 0});
      }).catch(error => {return error});
  },
  updateOrCreate (model, where, newItem) {
  // First try to find the record
  return model
    .findOne({where: where})
    .then(function (foundItem) {
      if (!foundItem) {
          // Item not found, create a new one
          return model
            .create(newItem)
            .then(function (item) { return  {item: item, created: true}; })
      }
       // Found an item, update it
      return model
        .update(newItem, {where: where})
        .then(function (item) { return {item: item, created: false} }) ;
    })
  },
  save(req, res) {
    var content = JSON.parse(req.body.obj);
    for (let tempUri in content){
      if (tempUri != 'i18nextLng'){
        module.exports.updateOrCreate(Annotation,
          {uri: tempUri},
          {
            uri: tempUri,
            status: 'active',
            state: content[tempUri],
            memberId: req.session.user.id
          })
          .then(function(result) {
            result.item;  // the model
            result.created; // bool, if a new item was created.
          });
      }
    }
    return res.send('success')
  },
  destroy(req, res) {
    return Annotation
      .findOne({
          where: {
            id: req.params.AnnotationId,
            bracketId: req.params.bracketId,
          },
        })
      .then(out => {
        if (!out) {
          return res.status(404).send({
            message: 'Annotation Not Found',
          });
        }
        return out.destroy()
          .then(() => res.status(200).send({ message: 'Player deleted successfully.' }))
          .catch(error => res.status(400).send(error));
      })
      .catch(error => res.status(400).send(error));
  },
  bulkCreate(array){
    for (var i=0; i < array.length; i++){
      Annotation.create({qid: array[i], status: 'basic'})
    }
  }
};
