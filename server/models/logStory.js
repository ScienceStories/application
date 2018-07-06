'use strict';
module.exports = (sequelize, DataTypes) => {
  const LogStory = sequelize.define('logstory', {
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
);
LogStory.associate = (models) => {
  LogStory.belongsTo(models.member, {
    foreignKey: 'memberId',
    as: 'member',
  });
  LogStory.belongsTo(models.story, {
    foreignKey: 'storyId',
    as: 'story',
  });
};


  return LogStory;
};
