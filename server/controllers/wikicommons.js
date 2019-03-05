const pyshellrunner = require('python-shell').PythonShell.run;
const appFetch =  require('../../app').appFetch;
const getURLPath =  require('../../app').getURLPath;
const sparqlController = require('./sparql');
module.exports = {
  getManifestURL(req, qid){
    return getURLPath(req, '/api/iiif/'+qid+'/wikicat/manifest.json');
  },
  generateCommonsCategoryManifest(req, res){
    let category = req.params.category;
    let manifestUrl = getURLPath(req, req.path);
    let pyoptions = {
      pythonPath: process.env.PYPATH,
      scriptPath: './pyscripts',
      args: [category, manifestUrl]
    }
      return pyshellrunner('wikidataToCommonsManifest.py', pyoptions,
         (err, results) => {
            // console.log(err);
            if (err){
              console.log(err);
              return res.send({"status": "server error"});
            }
            let manifestJSON = JSON.parse(results);
            return res.send(manifestJSON);
      });

  },
  generateCommonsManifestFromWikidataItem(req, res){
    let qid = req.params.qid;
    let query_url = sparqlController.getCommonsCategory(qid);
    return appFetch(query_url).then(output => {
      let val = output.results.bindings;
      if (val.length && val[0].commonsCat){
        req.params.category = val[0].commonsCat.value;
        return module.exports.generateCommonsCategoryManifest(req, res);
      }
      return res.send({'status': 'No commons category detected for this item'})
      })
  },
};
