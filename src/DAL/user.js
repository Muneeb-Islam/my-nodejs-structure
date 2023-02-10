const bcrypt = require("bcrypt");
const {User} = require("../../src/models/users");

const find_user = async (body) => {
  return await User.findOne({email: body.email});
};

const find_user_by_id = async (user_id) => {
  return await User.findOne({_id: user_id});
};
const delete_user_by_id = async (user_id) => {
  return await User.findByIdAndDelete({_id: user_id});
};
const signup_user = async (body) => {
  let user = new User({
    email: body.email,
    password: body.password,
    type: body.type,
    status: body.status,
  });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  user = await user.save();
  return user;
};

const checking_email_exist = async (email) => {
  return await User.findOne({email: email});
};


const is_user_authorized = async (userId) => {
  return await User.findOne({_id: userId, type: 0});
};
const find_student_by_email = async (email)=>{
return await User.findOne({email:email})
}
const find_employee_by_email = async (email)=>{
  return await User.findOne({email:email})
  }
const signup_student = async (body) => {
  let student = new User({
    email: body.email,
    password: body.password,
    type: body.type,
    status: body.status,
  });
  const salt = await bcrypt.genSalt(10);
  student.password = await bcrypt.hash(student.password, salt);
  student = await student.save();
  return student;
}
//********************************************** Employee *******************************************/
const signup_employee = async (body) => {
  let student = new User({
    email: body.email,
    password: body.password,
    type: body.type,
    status: body.status,
  });
  const salt = await bcrypt.genSalt(10);
  student.password = await bcrypt.hash(student.password, salt);
  student = await student.save();
  return student;
}
//**************************************************************************************************/
const find_and_delete_user = async(id)=>{
  return await User.findByIdAndDelete({_id:id})
}
module.exports = {
  find_employee_by_email,
  signup_user,
  checking_email_exist,
  find_user,
  is_user_authorized,
  find_user_by_id,
  delete_user_by_id,
  find_student_by_email,
  signup_student,find_and_delete_user,signup_employee
};
