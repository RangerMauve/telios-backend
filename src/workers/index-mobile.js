const bridge = require('rn-bridge')

const channel = bridge.channel

const userDataPath = bridge.app.datadir;
const env = 'development';

require('./Account.worker')({channel, userDataPath}); // eslint-disable-line
require('./Contacts.worker')({channel});
require('./messageIngress.worker')({channel, userDataPath});
require('./Mailbox.worker')({channel, env}); // eslint-disable-line
require('./File.worker')({channel}); // eslint-disable-line
