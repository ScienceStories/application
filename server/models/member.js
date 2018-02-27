'use strict';
const bcrypt = require("bcrypt");
module.exports = (sequelize, DataTypes) => {
  const Member = sequelize.define('member', {
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      }
    },
    confirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
//   password_digest: {
//   type: DataTypes.STRING,
//   validate: {
//     notEmpty: true
//   }
// },
// password: {
//   type: DataTypes.VIRTUAL,
//   allowNull: false,
//   validate: {
//     notEmpty: true
//   }
// },
// password_confirmation: {
//   type: DataTypes.VIRTUAL
// }
  },

  {
      hooks: {
        beforeCreate: (user) => {
          user.username = user.username.toLowerCase();
          user.email = user.email.toLowerCase();
          const salt = bcrypt.genSaltSync();
          user.password = bcrypt.hashSync(user.password, salt);
        }
      },
      instanceMethods: {
        validPassword: function(password) {
          return bcrypt.compareSync(password, this.password);
        }
      }}


);


// Member.beforeCreate(function(user, options, callback) {
// 	user.email = user.email.toLowerCase();
// 	if (user.password)
// 		return hasSecurePassword(user, options, callback);
// 	else
// 		return null;
// })
// Member.beforeUpdate(function(user, options, callback) {
// 	user.email = user.email.toLowerCase();
// 	if (user.password)
// 		return hasSecurePassword(user, options, callback);
// 	else
// 		return null;
// })

  // Member.beforeCreate(function(model, options) {
  //   debug('Info: ' + 'Storing the password');
  //
  //   return new Promise ((resolve, reject) => {
  //       model.generateHash(model.password, function(err, encrypted) {
  //           if (err) return reject(err);
  //           debug('Info: ' + 'getting ' + encrypted);
  //
  //           model.password = encrypted;
  //           debug('Info: ' + 'password now is: ' + model.password);
  //           return resolve(model, options);
  //       });
  //   });
  // });

  return Member;
};
