var request = require('request-json-light');
var docker = require('dockerorde');

config = null;
config_path = null;

var addContainer = function (app, manifest) {
  if(config.containers === undefined) {
    config.containers = {};
  }
  config.containers[app] = {
    name: manifest.name,
    displayName: manifest.displayName,
    version: manifest.version,
    description: manifest.description,
    type: manifest.type,
    defaultPort: manifest.defaultPort,
    container: manifest.container,
    containerId: manifest.containerId
  };
  fs.writeFileSync(config_path, JSON.stringify(config, null, 2));
},


var installDockerApp = function(app) {
  var client = request.newClient( 'https://raw.githubusercontent.com/');
  var manifestUrl = app + '/master/package.json';

  LOGGER.info('Installing application ' + app + '...');
  client.get(manifestUrl, function (err, res, manifest) {
    if (err) {
      LOGGER.info(err);
      LOGGER.info('Cannot find given app manifest. Make sure it lives on ' +
               'Github');
    } else {
      var Docker = require('dockerode');
      var docker = new Docker({socketPath: '/var/run/docker.sock'});
      docker.pull(manifest.container, function(err, data) {
        lastId = null;
        data.on('data', function(chunk) {
          console.log(chunk.toString());
          lastId = JSON.parse(chunk.toString()).id;
        });
        data.on('end', function(err) {
          var slug = manifest.name;
          var options = {
            'name': slug,
            'Image': manifest.container,
            'Tty': false
          };

          docker.createContainer(options, function (err, data) {
            addContainer(app, manifest);
            LOGGER.info(slug + ' container installed');
          });
        });
      });
    };
  });
};

modude.exports.configure = function(options, config, program) {
  config = config;
  config_path = options.config_path;

  program
    .command('install-docker <app>')
    .description('Add Docker-based app to current Cozy Light')
    .action(actions.installDockerApp);

};
