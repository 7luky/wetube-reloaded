import User from "../models/User";
import Video from "../models/Video";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import { response } from "express";

export const getJoin = (req, res) =>
  res.render("join", { pageTitle: "Create Account" });

export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const pageTitle = "Join";

  if (password !== password2) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "Password confirmation does not match.",
    });
  }

  const usernameExists = await User.exists({ $or: [{ username }, { email }] });
  if (usernameExists) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "이미 사용중인 username/useremail 입니다.",
    });
  }

  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
  } catch (error) {
    // console.log(error);
    return res.status(404).render("join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
  return res.redirect("/login");
};

export const getLogin = (req, res) =>
  res.render("login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = "Login";

  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "An account with this username does not exists.",
    });
  }
  // check if password correct
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "Wrong password.",
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  res.redirect("/");
};

export const startGithubLogin = (req, res) => {
  const baseUrl = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };

  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };

  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;

  const tokenRequest = await fetch(finalUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  const json = await tokenRequest.json();
  // console.log(json);
  // res.end(JSON.stringify(json));
  if ("access_token" in json) {
    const { access_token } = json;
    const apiUrl = "https://api.github.com";
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    // console.log(userData);

    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();

    const emailObj = emailData.find(
      (email) => email.primary === true && email.verified === true
    );

    if (!emailObj) {
      // set notification
      return res.redirect("/login");
      // MONGODB 서버 내에 있는 이메일, GITHUB 이메일이 존재할 경우 어떻게 처리 할 것인가?
      // primary인 email을 받고, 데이터베이스에서 같은 email을 가진 user를 발견하면,
      //난 그 user들을 로그인 시켜줄 것이다.
    }

    // console.log(emailData);

    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.avatar_url,
        name: userData.name,
        socialOnly: true,
        username: userData.login,
        email: emailObj.email,
        password: "",
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    return res.redirect("/login");
    // 나중에 유저에게 공지를 날려줄것이다.
  }
};
export const logout = (req, res) => {
  req.session.destroy();
  return res.redirect("/");
};

export const getEdit = (req, res) => {
  return res.render("edit-profile", {
    pageTitle: "Edit Profile",
  });
};

export const postEdit = async (req, res) => {
  const {
    session: {
      user: { _id, avatarUrl, email: sessionEmail, username: sessionUsername },
    },
    body: { name, email, username, location },
    file,
  } = req;
  // console.log(file);
  // 조건문을 어떻게 두지?
  // session 에 있는 정보 (email, username) 와 폼에 입력 된 정보가 다른가? 참
  // 그렇지 않을 경우

  let searchParams = [];
  if (sessionEmail !== email) {
    searchParams.push({ email });
  }
  if (sessionUsername !== username) {
    searchParams.push({ email });
  }
  if (searchParams.length > 0) {
    const foundUser = await User.findOne({ $or: searchParams });
    if (foundUser && foundUser._id.toString() !== _id) {
      return res.status(HTTP_BAD_REQUEST).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessage: "This username/email is already taken.",
      });
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      avatarUrl: file ? file.path : avatarUrl,
      name,
      email,
      username,
      location,
    },
    { new: true }
  );

  req.session.user = updatedUser;
  return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
  return res.render("./users/change-password", {
    pageTitle: "Change Password",
  });
};

export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id, password },
    },
    body: { oldPassword, newPassword, newPasswordConfirmation },
  } = req;
  const ok = await bcrypt.compare(oldPassword, password);

  if (!ok) {
    return res.status(400).render("./users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "The current password is incorrect",
    });
  }

  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).render("./users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "The apssword does not match the confirmation",
    });
  }

  const user = await User.findById(_id);
  user.password = newPassword;
  await user.save();
  req.session.user.password = user.password;
  return res.redirect("/users/logout");
};

export const see = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate({
    path: "videos",
    populate: {
      path: "owner",
      model: "User",
    },
  });
  if (!user) {
    return res.status(404).render("404", { pageTitle: "USER NOT FOUND." });
  }
  return res.render("users/profile", {
    pageTitle: user.name,
    user,
  });
};
