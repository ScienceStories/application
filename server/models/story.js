'use strict';
module.exports = (sequelize, DataTypes) => {
  const Story = sequelize.define('story', {
    qid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
);
  return Story;
};
