'use strict';
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('comment', {
    message: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default:  0
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default:  0
    },
  },
);
Comment.associate = (models) => {
  Comment.belongsTo(models.member, {
    foreignKey: 'memberId',
    as: 'member',
  });
  Comment.belongsTo(models.story, {
    foreignKey: 'storyId',
    as: 'story',
  });

}
  return Comment;
};
