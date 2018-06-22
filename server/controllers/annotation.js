const Annotation = require('../models').annotation;
const appFetch =  require('../../app').appFetch;
const loadPage =  require('../../app').loadPage;
const loadError =  require('../../app').loadError;
const fs = require('fs');
module.exports = {
  create(data) {
    return Annotation.create({
        uri: uri,
        status: 'active',
        state: data[uri],
        memberId: 1
      }).catch(error => {return 0});
  },
  select(req, res) {
    return Annotation
      .find({
          where: {
            qid: 'Q'+req.params.id,
            status: 'basic'
          },
        })
      .then(out => {
        if (!out) {
          return loadError(req, res, 'This annotation has not yet been curated.');
        }
        return wikidataController.processAnnotation(req, res, out);
      })
      .catch(error => loadError(req, res, 'Trouble Loading this Annotation'));
  },
  load(req, res) {
    sendData = {}
    return Annotation
      .all()
      .then(out => {
        for (anno in out){
          sendData[out[anno].uri] = out[anno].state
        }
        res.status(200).send(sendData)
      })
  },
  update(data) {
    return Annotation
      .find({
          where: {
            uri: data.uri,
          },
        })
      .then(out => {
        if (!out){
          return 0;
        }
        return out
          .update(data, { fields: Object.keys(data) })
          .then(() => {})
          .catch(error => {return 0});
      })
      .catch(error => {return error});
  },
  save(req, res) {
    var content = JSON.parse(req.body.obj);
    for (uri in content){
      obj = {
        uri: uri,
        status: 'active',
        state: content[uri],
        memberId: 1
      }
      temp = module.exports.update(obj).then(temp => {
        if (!temp){
        temp = module.exports.create(temp)
      }
    })

    }
    return res.status(200).send({
      message: 'Finished',
    });
  },

  destroy(req, res) {
    return Annotation
      .find({
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

        return out
          .destroy()
          .then(() => res.status(200).send({ message: 'Player deleted successfully.' }))
          .catch(error => res.status(400).send(error));
      })
      .catch(error => res.status(400).send(error));
  },
  bulkCreate(array){
    for (var i=0; i < array.length; i++){
      Annotation.create({
        qid: array[i],
        status: 'basic',
      })
    }
  }
};
