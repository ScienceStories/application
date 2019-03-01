const pyshellrunner = require('python-shell').PythonShell.run;
const urlformatter = require('url').format;
const appFetch =  require('../../app').appFetch;
const sparqlController = require('./sparql');

module.exports = {
  generateCommonsManifestFromWikidataItem(req, res){
    let url = sparqlController.getCommonsCategory(req.params.qid);
    return appFetch(url).then(output => {
      let val = output.results.bindings;
      if (val.length && val[0].commonsCat){

        let manifestUrl = urlformatter({
          protocol: req.protocol,
          host: req.get('host'),
          pathname: req.originalUrl
        }); //TODO: Move the url formatting to a shared helper util
        let pyoptions = {
          pythonPath: process.env.PYPATH,
          scriptPath: './pyscripts',
          args: [val[0].commonsCat.value, manifestUrl]
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
      }
      return res.send({'status': 'No commons category detected for this item'})
    })
  },
};
