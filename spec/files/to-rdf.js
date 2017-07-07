var fs = require('fs');
var jsonld = require('jsonld').promises;

fs.readdir('.', function(err, filenames) {
  filenames.filter(f => f.indexOf('.json') >= 0)
    .forEach(f => {
      console.log(f)
      fs.readFile(f, 'utf-8', (err, content) => {
        jsonld.toRDF(JSON.parse(content), {format: 'application/nquads'})
          .then(nquads => fs.writeFile(f.replace('.json', '.rdf'), nquads))
          .catch(err => console.log(err))
      })
    });
});