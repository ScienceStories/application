'use strict';
module.exports = (sequelize, DataTypes) => {
  const Annotation = sequelize.define('annotation', {
    uri: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
    },

  },
);
Annotation.associate = (models) => {
  Annotation.belongsTo(models.member, {
    foreignKey: 'memberId',
    as: 'member',
  });
};

  return Annotation;
};
