/* eslint-disable no-param-reassign */
const Sequelize = require('sequelize')
const removeMd = require('remove-markdown')
const { Model } = require('sequelize')
const { File } = require('./file.model.js')
const fileUtil = require('../utils/file.util')
const { v4: uuidv4 } = require('uuid')
const store = require('../Store')

const model = {
  emailId: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  folderId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  subject: {
    type: Sequelize.STRING
  },
  unread: {
    type: Sequelize.BOOLEAN
  },
  date: {
    type: Sequelize.STRING
  },
  toJSON: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fromJSON: {
    type: Sequelize.STRING,
    allowNull: false
  },
  ccJSON: {
    type: Sequelize.STRING
  },
  bccJSON: {
    type: Sequelize.STRING
  },
  bodyAsText: {
    type: Sequelize.STRING
  },
  bodyAsHtml: {
    type: Sequelize.STRING
  },
  attachments: {
    type: Sequelize.STRING
  },
  path: {
    type: Sequelize.STRING
  }
}

class Email extends Model {}

module.exports.Email = Email

module.exports.model = model

module.exports.init = async (channel, sequelize, opts) => {
  Email.init(model, {
    sequelize,
    tableName: 'Email',
    freezeTableName: true,
    timestamps: false
  })

  const drive = store.getDrive()
  const collection = await drive.collection('Email')

  Email.addHook('afterFind', async (email, options) => {
    channel.send({ event: 'findEmail', email })

    try {
      if (!Array.isArray(email) && options.attributes.includes('bodyAsHtml')) {
        const content = await fileUtil.readFile(email.path, { drive, type: 'email' })
        const e = JSON.parse(content)

        email.bodyAsHtml = e.bodyAsHtml || e.html_body || e.bodyAsText
      }

      if (Array.isArray(email) && options.attributes.includes('bodyAsText')) {
        for (let i = 0; i < email.length; i += 1) {
          let bodyAsText = removeMd(email[i].bodyAsText)
          bodyAsText = bodyAsText.replace(/\[(.*?)\]/g, '')
          bodyAsText = bodyAsText.replace(/(?:\u00a0|\u200C)/g, '')
          const selection = bodyAsText.split(' ').slice(0, 20)

          if (selection[selection.length - 1] !== '...') {
            selection.push('...')
          }

          email[i].bodyAsText = selection.join(' ')
        }
      }
    } catch (err) {
      channel.send({ event: 'findEmail', error: err.message })
      throw err
    }
  })

  Email.addHook('beforeCreate', async (email, options) => {
    channel.send({ event: 'BEFORE-BeforeCreate-saveMessageToDBLOG', data: email })
    try {
      email.bodyAsText = removeMd(email.bodyAsText)
      email.bodyAsText = email.bodyAsText.replace(/\[(.*?)\]/g, '')
      email.bodyAsText = email.bodyAsText.replace(/(?:\u00a0|\u200C)/g, '')

      if (!email.path) {
        email.path = `/email/${uuidv4()}.json`
      }

      // Save email to drive
      await fileUtil.saveEmailToDrive({ email, drive })
      email.bodyAsHtml = null

      await collection.put(email.emailId,
        {
          unread: email.unread,
          folderId: email.folderId,
          path: email.path
        }
      )

      channel.send({ event: 'BeforeCreate-saveMessageToDBLOG', data: email })
    } catch (err) {
      channel.send({ event: 'BeforeCreate-saveMessageToDBLOG', error: err.message })
      throw new Error(err)
    }
  })

  Email.addHook('beforeUpdate', async (email, options) => {
    try {
      email.bodyAsText = removeMd(email.bodyAsText)
      email.bodyAsText = email.bodyAsText.replace(/\[(.*?)\]/g, '')
      email.bodyAsText = email.bodyAsText.replace(/(?:\u00a0|\u200C)/g, '')
      email.bodyAsHtml = null

      await collection.put(email.emailId,
        {
          unread: email.unread,
          folderId: email.folderId,
          path: email.path
        }
      )

      channel.send({ event: 'BeforeUpdate-saveMessageToDBLOG', data: email })
    } catch (err) {
      channel.send({
        event: 'BeforeUpdate-saveMessageToDBLOG',
        error: {
          name: err.name,
          message: err.message,
          stacktrace: err.stack
        }
      })
      throw err
    }
  })

  Email.addHook('beforeUpsert', async (email, options) => {
    try {
      email.bodyAsText = removeMd(email.bodyAsText)
      email.bodyAsText = email.bodyAsText.replace(/\[(.*?)\]/g, '')
      email.bodyAsText = email.bodyAsText.replace(/(?:\u00a0|\u200C)/g, '')
      email.bodyAsHtml = null

      await collection.put(email.emailId,
        {
          unread: email.unread,
          folderId: email.folderId,
          path: email.path
        }
      )

      return email
    } catch (err) {
      channel.send({ event: 'BeforeUpsert-saveMessageToDBLOG', error: err.message })
      throw err
    }
  })

  Email.addHook('beforeDestroy', async (email, options) => {
    const asyncArr = []
    const drive = store.getDrive()
    channel.send({ event: 'beforeDestroyEmail', email })

    asyncArr.push(collection.del(email.emailId))
    asyncArr.push(drive.unlink(email.path))

    asyncArr.push(
      File.destroy({
        where: { emailId: email.emailId },
        individualHooks: true
      })
    )

    const result = await Promise.all(asyncArr)
  })

  return Email
}
