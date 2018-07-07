'use strict';
module.exports = (sequelize, DataTypes) => {
  const StoryActivity = sequelize.define('storyactivity', {
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    favorite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastViewed: {
      type: DataTypes.TIME,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },


  },
);
StoryActivity.associate = (models) => {
  StoryActivity.belongsTo(models.member, {
    foreignKey: 'memberId',
    as: 'member',
  });
  StoryActivity.belongsTo(models.story, {
    foreignKey: 'storyId',
    as: 'story',
  });
}
  return StoryActivity;
};
