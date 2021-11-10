const { File } = require('../models/file.model');
const fileUtil = require('../utils/file.util');
const store = require('../Store');

module.exports = ({channel}) => {
  channel.on('message', async data => {
    const { event, payload } = data;

    if (event === 'getFile') {
      const { id } = payload;
      const drive = store.getDrive();

      try {
        const file = await File.findByPk(id, {
          attributes: ['id', 'drive', 'path', 'key', 'header'],
          raw: true
        });

        const fileContent = await fileUtil.readFile(file.path, { drive, key: file.key, header: file.header });

        return channel.send({ event: `getFile${id}`, data: fileContent });
      } catch(e) {
        channel.send({ event: 'getFile', error: e.message });
      }
    }
  });
};

