const sharp = require("sharp");
const s3 = require("../../config/S3_config/s3.config");
let upload = require("../../config/S3_config/multer.config");
const { v1: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const path = require("path");
const AWS = require("aws-sdk");
//*******************************{RENDER BAD REQUEST}*******************************
const RENDER_BAD_REQUEST = (res, error) => {
  console.log(error);
  if (error.message) {
    res.status(400).json({
      message: error.message,
    });
  } else {
    res.status(400).send(error);
  }
};
//*******************************{change order in delete case}*******************************
const CHANGE_DEL_ORDER = async (current_order, schema) => {
  let doc = await schema.find({
    order: {
      $gte: current_order,
    },
  });
  const promise = doc.map(async (Obj) => {
    Obj.order = Obj.order - 1;
    await Obj.save();
  });
  await Promise.all(promise);
};
//*******************************{ORDER_CHANGE_TO_LOWER}*******************************
const ORDER_CHANGE_TO_LOWER = async (current_order, past_order, schema) => {
  let doc = await schema.find({
    order: {
      $gte: current_order,
      $lte: past_order,
    },
  });
  console.log(doc, "doc");
  const promise = doc.map(async (Obj) => {
    Obj.order = Obj.order + 1;
    await Obj.save();
  });
  await Promise.all(promise);
};
//*******************************{_ORDER_CHANGE_TO_UPPER}*******************************
const ORDER_CHANGE_TO_UPPER = async (current_order, past_order, schema) => {
  let doc = await schema.find({
    order: {
      $gte: past_order,
      $lte: current_order,
    },
  });
  console.log(doc, "this is doc");
  const promise = doc.map(async (Obj) => {
    Obj.order = Obj.order - 1;
    await Obj.save();
  });
  await Promise.all(promise);
};
//*******************************{MAX_ORDER}*******************************
const MAX_ORDER = async (modelName, query_obj = {}) => {
  let max_order = 0;
  let x;
  x = await modelName
    .findOne(query_obj)
    .sort({ order: -1 })
    .limit(1)
    .select({ order: 1, _id: 0 });
  if (x) {
    max_order = x.order;
  }
  return max_order;
};
//*******************************{SEND_EMAIL}*******************************
const SEND_EMAIL = async (code, receiver) => {
  require("dotenv").config();
  const sg_mail = require("@sendgrid/mail");
  console.log(process.env.EMAIL_API_KEY, "KEY");
  sg_mail.setApiKey(process.env.EMAIL_API_KEY);
  const message = {
    to: receiver,
    from: process.env.EMAIL_FROM,
    subject: "Verification code",
    text: `Here is code you can use to reset password ${code}`,
    //html: "<h1>This is html</h1>",
  };
  const result = await sg_mail
    .send(message)
    .then((res) => {
      console.log("Email Sent");
      return res;
    })
    .catch((err) => {
      console.log("Email did not  Send", err);
      return err;
    });
  return result;
};
//*******************************{  UPLOAD AUDIO FILE}*******************************
const UPLOAD_AUDIO_FILE = async (files, resp) => {
  const myPromise = new Promise(async (resolve, reject) => {
    try {
      let image_file = files.audio;
      let file_name = path.extname(files.audio.name);
      //define upload file name store url
      let audio_file_name = uuidv4() + file_name;
      let audio_path = audio_file_name;
      let file_path = "./src/utils/audio/" + audio_file_name;
      fs.mkdirsSync("./src/utils/audio/");
      image_file.mv(file_path, async (err) => {
        if (err) {
          resp.error = true;
          resp.error_message = err;
          return resp;
        } else {
          resolve(audio_path);
        }
      });
    } catch (error) {
      resp.error = true;
      resp.error_message = error;
      return resp;
    }
  });

  return myPromise;
};
//*******************************{UPLOAD AND RESIZE FILE}*******************************
const UPLOAD_AND_RESIZE_FILE = async (image_buffer_data, dir, image_size) => {
  const myPromise = new Promise(async (resolve, reject) => {
    try {
      let image_name = uuidv4() + ".jpeg";
      await sharp(image_buffer_data)
        .jpeg({
          quality: 100,
          chromaSubsampling: "4:4:4",
        })
        .resize(image_size)
        .toFile(dir + image_name, async (err, info) => {
          if (err) resolve(false);
        });
      resolve(image_name);
    } catch (error) {
      console.log(error, "error in uploading");
      resolve(false);
    }
  });

  return myPromise;
};
//*******************************{UPLOAD IMAGE ON S3}*******************************
const UPLOAD_S3_IMAGE = async (img_name, dir, image_data) => {
  let response = {};
  let image_file_name = "";
  let savePath = dir;
  image_file_name = img_name;

  sharp(image_data)
    .resize(300, 300)
    .toBuffer(async (err, info) => {
      if (err) {
        console.log(err, "toBuffer error in uploader");
      } else {
        upload.single("file");
        const s3Client = s3.s3Client;
        const params = s3.uploadParams;
        params.Key = savePath + image_file_name;
        params.Body = info;
        params.ContentType = "image/jpeg";
        try {
          let result = await s3Client.upload(params).promise();
          response = image_file_name;
        } catch (err) {
          console.log("error in s3 uploading", err);
        }
      }
    });

  return response;
};
//*******************************{SEND NOTIFICATION}*******************************
const SEND_NOTIFICATION = async (message) => {
  // Send a message to devices subscribed to the provided topic.
  return admin
    .messaging()
    .send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch((error) => {
      console.log("Error sending message:", error);
    });
};
//*******************************{AWS SES Email}*******************************
const NOTIFY_BY_EMAIL_FROM_SES = async (
  email,
  subject,
  email_body,
  attachments_file_array = []
) => {
  const SES_CONFIG = {
    accessKeyId: "AKIASFHMCRVPUfffvcv3V2LPUW",
    secretAccessKey: "a7OG8xc+Htjvvcvcvhghcvzcxvx6+7UkO2gEk572jlstI9x+8Mx+03sa",
    region: "us-west-1",
  };

  const AWS_SES = new AWS.SES(SES_CONFIG);

  let params = {
    Source: "Meta Logix Tech<support@tech.com>",
    Destination: {
      ToAddresses: [email],
    },
    ReplyToAddresses: ["support@ech.com"],
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: email_body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
  };
  return AWS_SES.sendEmail(params).promise(); // or something
};
module.exports = {
  RENDER_BAD_REQUEST,
  CHANGE_DEL_ORDER,
  ORDER_CHANGE_TO_LOWER,
  ORDER_CHANGE_TO_UPPER,
  MAX_ORDER,
  SEND_EMAIL,
  UPLOAD_AND_RESIZE_FILE,
  UPLOAD_AUDIO_FILE,
  UPLOAD_S3_IMAGE,
  SEND_NOTIFICATION,
  NOTIFY_BY_EMAIL_FROM_SES,
};
