'use strict';
import {User} from '../db/models/user';
import {Project} from '../db/models/project';
import Permission from '../util/permission';
import {done} from '../helpers/response-handler';

/**
 * Create project under user's organization
 * @param  {object} event
 * @param  {object} context
 * @param  {object} callback
 * @return {function} done
 */
export const create = (event, context, callback) => {
  const name = JSON.parse(event.body).name;
  if (name == null || name.trim() == '') {
    return callback(null, done({
      statusCode: 400,
      message: `Request doesn't contain a valid object`,
    }));
  }

  const uuid = event.requestContext.authorizer.principalId;
  Permission.hasPermission(uuid, {realm: 'project', action: 'create'})
    .then((confirmation) => {
      if (!confirmation) {
        return callback(null, done({
          statusCode: 403,
          message: `User doesn't have enough permission to perform this action`,
        }));
      };

      User.find({
        attributes: ['uuid', 'organizationId'],
        where: {
          uuid: uuid,
        },
      }).then((user) => {
        Project.create({
          name: name,
          ownerId: uuid,
          organizationId: user.organizationId,
        }).then((project) => {
          user.addProject(project, {
            through: {
              permission: `{"specific":["admin"]}`,
            }}).then((result) => {
            result[0][0].permission = JSON.parse(result[0][0].permission);
            return callback(null, done(null, {
              statusCode: 200,
              data: result[0][0]}
            ));
          }).catch((error) => {
            return callback(null, done({
              statusCode: 500,
              message: error,
            }));
          });
        }).catch((error) => {
          return callback(null, done({
            statusCode: 500,
            message: error,
          }));
        });
      }).catch((error) => {
        return callback(null, done({
          statusCode: 500,
          message: error,
        }));
      });
    }).catch((error) => {
      return callback(null, done({
        statusCode: 500,
        message: error,
      }));
    });
};

/**
 * Insert user to a given project
 * @param {*} event
 * @param {*} context
 * @param {*} callback
 * @return {function} done
 */
export const insert = (event, context, callback) => {
  const userId = JSON.parse(event.body).userId;
  const projectId = JSON.parse(event.body).projectId;

  if (
    userId == null || userId.trim() == '' ||
    projectId == null || isNaN(projectId)
  ) {
    return callback(null, done({
      statusCode: 400,
      message: `Request doesn't contain a valid object`,
    }));
  }

  const uuid = event.requestContext.authorizer.principalId;
  Permission.hasProjectPermission({
    uuid: uuid,
    projectId: projectId,
  }, {realm: 'specific', action: 'insert'})
    .then((confirmation) => {
      if (!confirmation) {
        return callback(null, done({
          statusCode: 403,
          message: `User doesn't have enough permission to perform this action`,
        }));
      };

       User.find({
        attributes: ['uuid', 'organizationId'],
        where: {
          uuid: userId,
        },
      }).then((user) => {
        Project.find({
          where: {
            id: projectId,
            organizationId: user.organizationId,
          },
        }).then((project) => {
            if (project != null) {
              project.addUser(user).then((result) => {
                if (result.length == 0) {
                  return callback(null, done({
                    statusCode: 400,
                    message: `User has been already added to this project`,
                  }));
                } else {
                  return callback(null, done(null, {
                    statusCode: 200,
                    data: result[0][0],
                  }));
                }
              }).catch((error) => {
                return callback(null, done({
                  statusCode: 500,
                  message: error,
                }));
              });
            } else {
              return callback(null, done({
                statusCode: 400,
                message: `Project not found`,
              }));
            }
        }).catch((error) => {
          return callback(null, done({
            statusCode: 500,
            message: error,
          }));
        });
      }).catch((error) => {
        return callback(null, done({
          statusCode: 500,
          message: error,
        }));
      });
    }).catch((error) => {
      return callback(null, done({
        statusCode: 500,
        message: error,
      }));
    });
};

