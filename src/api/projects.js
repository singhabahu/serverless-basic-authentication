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
              permission: `{"projectSpecific":["admin"]}`,
            }}).then((result) => {
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
        message: error.message,
      }));
    });
};
