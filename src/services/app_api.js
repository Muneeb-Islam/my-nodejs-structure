const {v1: uuidv1} = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  UPLOAD_S3_IMAGE,
  UPLOAD_AND_RESIZE_FILE,
  UPLOAD_AUDIO_FILE,
  NOTIFY_BY_EMAIL_FROM_SES,
} = require("../utils/utils");
const {
  add_to_session,
  get_session_by_user_id,
  delete_from_session,
} = require("../DAL/session");
const {
  find_user,
  find_user_by_id,
  checking_email_exist,
} = require("../DAL/user");
const {detail_admin} = require("../DAL/admin");
const {
  find_customer_by_user_id,
} = require("../DAL/customer");
const {v1: uuidv4} = require("uuid");
const {getAudioDurationInSeconds} = require("get-audio-duration");
const fs = require("fs");
//**********************************{LOGIN API}***************************************************
const _loginUser = async (body, resp) => {
  // 
  const user = await find_user(body.email);
  if (!user) {
    resp.error = true;
    resp.error_message = "Invalid Email Address!";
    return resp;
  }
  if (user.type !== body.type) {
    resp.error = true;
    resp.error_message = "Invalid Type!";
    return resp;
  }
  // const isValidPassword = await bcrypt.compare(body.password, user.password);
  // if (!isValidPassword) {
  //   resp.error = true;
  //   resp.error_message = "Invalid Email or Password";
  //   return resp;
  // }

 // generating token
  const access = "auth";
  const json_token = uuidv1();
  const token = jwt
    .sign({login_token: json_token, access}, process.env.JWT_SECRET)
    .toString();
  const add_session = await add_to_session(json_token, user._id);

  if (!add_session) {
    resp.error = true;
    resp.error_message = "Login Failed";
    return resp;
  }
  let detail;
  if (user.type == 0) {
    detail = await detail_admin(user._id);
  } else {
    detail = await find_customer_by_user_id(user._id);
  }

  resp.data = {
    token: token,
    admin: detail,
  };

  return resp;
};
const loginUser = async (body) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _loginUser(body, resp);
  return resp;
};
//**********************************{CHANGE PASSWORD}***************************************************
const _changePassword = async (body, user_id, resp) => {
  if (body.new_password !== body.confirm_password) {
    resp.error = true;
    resp.error_message = "Password And Confirm Password Not Matched";
    return resp;
  }

  let user = await find_user_by_id(user_id);
  if (!user) {
    resp.error = true;
    resp.error_message = "Something Wrong";
    return resp;
  }
  const isValidPassword = await bcrypt.compare(
    body.old_password,
    user.password
  );

  if (!isValidPassword) {
    resp.error = true;
    resp.error_message = "Old Password Is Incorrect";
    return resp;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(body.new_password, salt);
  user = await user.save();
  return resp;
};
const changePassword = async (body, user_id) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _changePassword(body, user_id, resp);
  return resp;
};
//**********************************{CHANGE EMAIL}***************************************************
const _changeEmail = async (body, user_id, resp) => {
  let user = await find_user_by_id(user_id);
  if (!user) {
    resp.error = true;
    resp.error_message = "Something Went Wrong";
    return resp;
  }

  if (body.email !== user.email) {
    let check_user_email = await find_user(body.email);
    if (check_user_email) {
      resp.error = true;
      resp.error_message = "User With This Email Already Exist";
      return resp;
    }
  }

  user.email = body.email;
  user = await user.save();
  return resp;
};
const changeEmail = async (body, user_id) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _changeEmail(body, user_id, resp);
  return resp;
};
//**********************************{LOGOUT USER}***************************************************
const _logoutUser = async (user_id, resp) => {
  const session = await get_session_by_user_id(user_id);
  if (!session) {
    resp.error = true;
    resp.error_message = "Something Wrong";
    return resp;
  }
  const delete_session = await delete_from_session(session._id);
  if (!delete_session) {
    resp.error = true;
    resp.error_message = "Something Wrong";
    return resp;
  }
  return resp;
};
const logoutUser = async (user_id) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _logoutUser(user_id, resp);
  return resp;
};
//**********************************{VALIDATE EMAIL ADDRESS}***************************************************
const _validateEmailAddress = async (body, resp) => {
  // find user by email
  const user = await checking_email_exist(body.email);
  if (!user) {
    resp.error = true;
    resp.error_message = "Invalid Email Address";
    return resp;
  }
  // generate code
  const code =
    Math.floor(Math.random() * (9 * Math.pow(10, 6 - 1))) + Math.pow(10, 6 - 1);
  user.verification_code = code;
  await user.save();
  let subject = `Email Verification Code`;
  let email_body = `Hi, Your Email verification code is ${code}`;
  await NOTIFY_BY_EMAIL_FROM_SES(user.email, subject, email_body);
  return resp;
};
const validateEmailAddress = async (body) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _validateEmailAddress(body, resp);
  return resp;
};
//**********************************{VALIDATE CODE SEND FROM EMAIL }***************************************************
const _codeValidation = async (body, resp) => {
  // find user by email
  const user = await checking_email_exist(body.email);
  if (!user) {
    resp.error = true;
    resp.error_message = "Invalid Email Address";
    return resp;
  }

  if (user.verification_code == body.verification_code) {
    user.verification_code = "";
    user.verification_status = true;
    await user.save();
    return resp;
  } else {
    resp.error = true;
    resp.error_message = "Invalid code or code is expire";
    return resp;
  }
};
const codeValidation = async (body) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _codeValidation(body, resp);
  return resp;
};
// **********************************{RESET PASSWORD}***************************************************
const _resetPassword = async (body, resp) => {
  // find user by email
  const user = await checking_email_exist(body.email);
  if (!user) {
    resp.error = true;
    resp.error_message = "Invalid Email Address";
    return resp;
  }

  if (body.password !== body.confirm_password) {
    resp.error = true;
    resp.error_message = "Password and confirm password are not matched";
    return resp;
  }
  if (user.verification_status !== true) {
    resp.error = true;
    resp.error_message = "Something get wrong";
    return resp;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(body.password, salt);
  user.verification_status = false;
  await user.save();
  return resp;
};
const resetPassword = async (body) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _resetPassword(body, resp);
  return resp;
};
// **********************************{UPLOAD IMAGE ON S3}***************************************************
const _uplaodImageS3 = async (files, resp) => {
  if (
    files == null ||
    files.image == null ||
    files.image == undefined ||
    files.image == " "
  ) {
    resp.error = true;
    resp.error_message = "please Upload Image";
    return resp;
  }
  let dir = "images/";
  let image_name = uuidv4() + ".jpeg";
  image_path = dir.concat(image_name);

  const upload_image_response = await UPLOAD_S3_IMAGE(
    image_name,
    dir,
    files.image.data
  );
  if (upload_image_response.status == false) {
    resp.error = true;
    resp.error_message = "Something get wrong";
    return resp;
  }

  resp.data = {
    path: image_path,
  };
  return resp;
};
const uplaodImageS3 = async (files) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _uplaodImageS3(files, resp);
  return resp;
};
// **********************************{UPLOAD AND RESIZE FILE}***************************************************
const _uplaodImage = async (files, resp) => {
  if (
    files == null ||
    files.image == null ||
    files.image == undefined ||
    files.image == " "
  ) {
    resp.error = true;
    resp.error_message = "please Upload Image";
    return resp;
  }
  let dir = "./src/utils/images/";
  let image_name = uuidv4() + ".jpeg";
  image_path = dir.concat(image_name);

  const upload_image_response = await UPLOAD_AND_RESIZE_FILE(
    files.image.data,
    dir,
    {width: 200}
  );
  if (upload_image_response == false) {
    resp.error = true;
    resp.error_message = "Something get wrong";
    return resp;
  }

  resp.data = {
    path: image_path,
  };
  return resp;
};
const uplaodImage = async (files) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _uplaodImage(files, resp);
  return resp;
};
// **********************************{UPLOAD AUDIO}***************************************************
const _uplaodAudio = async (files, resp) => {
  if (
    files == null ||
    files.audio == null ||
    files.audio == undefined ||
    files.audio == " "
  ) {
    resp.error = true;
    resp.error_message = "please Upload audio";
    return resp;
  }
  // move file to audio folder in utils
  const response = await UPLOAD_AUDIO_FILE(files, resp);
  if (response.error) {
    return response;
  }
  console.log(response, "response");
  // calculate duration of audio file
  await getAudioDurationInSeconds("./src/utils/audio/" + response).then(
    (duration_in_sec) => {
      let duration_in_hours = Math.floor(duration_in_sec / 3600); // get hours
      let duration_in_minutes = Math.floor(
        (duration_in_sec - duration_in_hours * 3600) / 60
      );
      let duration_in_seconds =
        duration_in_sec - duration_in_hours * 3600 - duration_in_minutes * 60; //  get seconds

      console.log(duration_in_sec, "duration in seconds");
      console.log(duration_in_minutes, "duration in minutes");
      console.log(duration_in_hours, "duration in hours");
      console.log(
        duration_in_seconds,
        "duration in seconds left after minutes"
      );
    }
  );
  // delete file now
  await fs.unlink("./src/utils/audio/" + response, function (err) {
    if (err) throw err;
    // if no error, file has been deleted successfully
    console.log("File deleted!");
  });
  resp.data = {path: response};
  return resp;
};
const uplaodAudio = async (files) => {
  let resp = {
    error: false,
    error_message: "",
    data: {},
  };

  resp = await _uplaodAudio(files, resp);
  return resp;
};
module.exports = {
  loginUser,
  changePassword,
  logoutUser,
  validateEmailAddress,
  codeValidation,
  resetPassword,
  changeEmail,
  uplaodImageS3,
  uplaodImage,
  uplaodAudio,
};
