var request = require('request-json');
var Docker = require('dockerode');

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
};


var installDockerApp = function(app) {
  var client = request.newClient( 'https://raw.githubusercontent.com/');
  var manifestUrl = app + '/master/package.json';

  LOGGER.info('Installing Docker Container ' + app + '...');
  client.get(manifestUrl, function (err, res, manifest) {
    if (err) {
      LOGGER.info(err);
      LOGGER.info('Cannot find given container manifest. Make sure it ' +
                  'lives on Github');
    } else {
      var docker = new Docker({socketPath: '/var/run/docker.sock'});
      docker.pull(manifest.container, function(err, data) {
        data.on('data', function(chunk) {
          console.log(chunk.toString());
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


var uninstallDockerApp = function(app) {
  console.log('Non implemented yet cannot uninstall ' + app + '.');
};


module.exports.getTemplate = function() {
  return '<p>docker</p>'
};


module.exports.configure = function(options, config, program) {
  config = config;
  config_path = options.config_path;

  program
    .command('install-docker <app>')
    .description('Add Docker-based app to current Cozy Light')
    .action(installDockerApp);

  program
    .command('uninstall-docker <app>')
    .description('Remove Docker-based app from current Cozy Light')
    .action(uninstallDockerApp);
};
