var request = require('request-json-light');
var Docker = require('dockerode');

var LOGGER = require('printit')({ prefix: 'Docker Plugin'});

module.exports.config = null;
module.exports.configPath = null;


// Containers could not be considered as app since they require specific
// startup.
var addContainer = function (app, manifest) {
  if(config.containers === undefined) {
    config.containers = {};
  }
  module.exports.config.apps[app] = {
    name: manifest.name,
    displayName: manifest.displayName,
    version: manifest.version,
    description: manifest.description,
    type: manifest.type,
    defaultPort: manifest.defaultPort,
    container: manifest.container,
    containerId: manifest.containerId
  };
  fs.writeFileSync(module.exports.configPath,
                   JSON.stringify(module.exports.config, null, 2));
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
        if (err) {
          LOGGER.error('An error occured while installing the Docker app.');
          return console.log(err);
        }
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


module.exports.configureAppServer = function(app, config, routes, callback) {
  var Docker = require('dockerode');
  var docker = new Docker({ socketPath: '/var/run/docker.sock' });

  port = config.port + 1000;

  async.eachSeries(Object.keys(config.apps), function (key, cb) {
    var dockerApp = config.apps[key];

    if (dockerApp.type === 'docker') {
      var container = docker.getContainer(dockerApp.name);
      port++;
      container.defaultOptions.start.PortBindings = {}
      container.defaultOptions.start.PortBindings[dockerApp.defaultPort + "/tcp"] = [{ "HostPort": "" + port }]
      container.start(function (err, data) {
        if(err) { console.log(err); };
        routes[dockerApp.name] = port;
        LOGGER.info(dockerApp.displayName + ' started on port ' + port + '. Enjoy!');
        cb();
      });
    } else {
      cb();
    };

  }, callback);
};


module.exports.getTemplate = function() {
  return '';
};


module.exports.configure = function(options, config, program) {
  module.exports.config = config;
  module.exports.configPath = options.config_path;

  program
    .command('install-docker <app>')
    .description('Add Docker-based app to current Cozy Light')
    .action(installDockerApp);

  program
    .command('uninstall-docker <app>')
    .description('Remove Docker-based app from current Cozy Light')
    .action(uninstallDockerApp);
};
