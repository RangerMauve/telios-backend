const bridge = require('rn-bridge')

const channel = bridge.channel

const userDataPath = bridge.app.datadir;
const env = 'development';


require('./Account.worker')({channel, userDataPath}); // eslint-disable-line
require('./Contacts.worker')();
require('./messageIngress.worker')(userDataPath);
require('./Mailbox.worker')(env); // eslint-disable-line
require('./File.worker')(); // eslint-disable-line
