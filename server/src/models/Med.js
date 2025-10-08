import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { User } from "./User.js";

export const Med = sequelize.define(
  "Med",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dose: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    times: {
      type: DataTypes.TEXT, // store as JSON string
      get() {
        const rawValue = this.getDataValue("times");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("times", JSON.stringify(value));
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

// Relation (each medication belongs to one user)
Med.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Med, { foreignKey: "userId" });
