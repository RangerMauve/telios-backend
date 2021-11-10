const Sequelize = require('sequelize');
const { Contact } = require('../models/contact.model');

const { Op } = Sequelize;
module.exports = ({channel}) => {
  channel.on('message', async data => {
    const { event, payload } = data;

    if (event === 'createContacts') {
      const { contactList } = payload;

      Contact.bulkCreate(contactList, {
        updateOnDuplicate: ['email'],
        individualHooks: true
      })
        .then(res => {
          return channel.send({ event: 'createContacts', data: res });
        })
        .catch(e => {
          channel.send({ event: 'createContacts', error: e.message });
        });
    }

    if (event === 'getContactById') {
      const { id } = payload;

      Contact.findAll({
        where: { contactId: id },
        raw: true
      })
        .then(contact => {
          return channel.send({ event: 'getContactById', data: null });
        })
        .catch(e => {
          channel.send({ event: 'getContactById', error: e.message });
        });
    }

    if (event === 'updateContact') {
      try {
        await Contact.update(payload, {
          where: {
            contactId: payload.id
          },
          individualHooks: true
        });
        channel.send({ event: 'updateContact', data: null });
      } catch (e) {
        channel.send({ event: 'updateContact', error: e.message });
      }
    }

    if (event === 'searchContact') {
      const { searchQuery } = payload;

      Contact.findAll({
        attributes: ['photo', ['email', 'address'], 'name'],
        where: {
          [Op.or]: [
            { email: { [Op.like]: `%${searchQuery}%` } },
            { name: { [Op.like]: `%${searchQuery}%` } }
          ]
        },
        raw: true
      })
        .then(contact => {
          return channel.send({ event: 'searchContact', data: contact });
        })
        .catch(e => {
          channel.send({ event: 'searchContact', error: e.message });
        });
    }

    if (event === 'removeContact') {
      const { id } = payload;

      Contact.destroy({
        where: { contactId: id },
        individualHooks: true
      })
        .then(() => {
          return channel.send({ event: 'removeContact', data: null });
        })
        .catch(e => {
          channel.send({ event: 'removeContact', error: e.message });
        });
    }

    if (event === 'getAllContacts') {
      try {
        const contacts = await Contact.findAll({
          attributes: [
            ['contactId', 'id'],
            'name',
            'givenName',
            'familyName',
            'nickname',
            'birthday',
            'photo',
            'email',
            'phone',
            'address',
            'website',
            'notes',
            'organization'
          ],
          raw: true
        });

        channel.send({ event: 'getAllContacts', data: contacts });
        return contacts;
      } catch (e) {
        channel.send({ event: 'getAllContacts', error: e.message });
      }
    }
  });
};
