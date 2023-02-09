const { checking_session } = require("../DAL/session");
const { is_user_authorized } = require("../DAL/user");
const jwt = require("jsonwebtoken");

const admin_authenticate = async (req, res, next) => {
  try {
    const user_id = req.user;
    let admin = await is_user_authorized(user_id);
    if (!admin) {
      return res.status(401).json({ code: 401, message: "Unathurized " });
    }
    next();
  } catch (e) {
    return res
      .status(401)
      .json({ code: 401, message: "Invalid Token", Error_Error: e.message });
  }
};

module.exports = { admin_authenticate };
