// server/src/models/Reading.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { User } from "./User.js";

export const Reading = sequelize.define(
  "Reading",
  {
    glucose: { type: DataTypes.FLOAT, allowNull: false },
    a1c: { type: DataTypes.FLOAT },
    weight: { type: DataTypes.FLOAT },
    takenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { timestamps: true }
);

Reading.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Reading, { foreignKey: "userId" });
