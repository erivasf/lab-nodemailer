const jwt = require('jsonwebtoken');
const User = require('./../models/User');
const transport = require('./../handlers/sendMail');

exports.getLoginForm = (req, res) => {
  const config = {
    action: '/login',
    title: 'Log in',
    redirection: `Don't have an account yet? <a href="/signup">Sign up</a>`
  };
  res.render('auth/form', config);
};

exports.getSignupForm = (req, res) => {
  const config = {
    action: '/signup',
    title: 'Sign up',
    redirection: `Already have an account? <a href="/login">Log in</a>`,
    isSignup: true
  };
  res.render('auth/form', config);
};

exports.loginUser = (req, res) => {
  res.redirect('/user');
};

exports.createUser = async (req, res) => {
  const {
    email,
    password,
    username
  } = req.body;
  const confirmationCode = jwt.sign({
    email
  }, process.env.SECRET);

  const {
    _id
  } = await User.register({
    email,
    username,
    confirmationCode
  }, password);

  const text = `
    Verify your email through this link:
    <a href="http://localhost:${process.env.PORT}/user/verify/${confirmationCode}">
      http://localhost:${process.env.PORT}/user/verify/${confirmationCode}
    </a>
  `;

  await transport.sendMail({
    from: `"Yo merengues " <${process.env.EMAIL}>`,
    to: email,
    subject: 'Verify your email',
    text,
    html: `<h1>Welcome</h1>
      <p>${text}</p>
    `
  });
  res.redirect('/login');
};

exports.getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  user.status = user.confirmationCode ? 'Not verified' : 'Verified';
  res.render('auth/private', user);
};

exports.verifyAccount = async (req, res) => {
  const {
    code
  } = req.params;
  const user = await User.findById(req.user.id);
  console.log(code);
  console.log(user.confirmationCode);
  if (code === user.confirmationCode) {
    user.confirmationCode = undefined;
    await user.save();
    console.log('entering');
  } else if (user.confirmationCode) {
    res.send(`
      Wrong code :/
      <a href="/user">Go back</a>
    `);
  }

  res.redirect('/user');
};

exports.resetVerifyCode = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.confirmationCode) {
    user.confirmationCode = jwt.sign({
      email: user.email
    }, process.env.SECRET);
    const text = `
  Verify your email through this link:
    <a href="http://localhost:${process.env.PORT}/user/verify/${user.confirmationCode}">
      http://localhost:${process.env.PORT}/user/verify/${user.confirmationCode}
    </a>
  `;

    await transport.sendMail({
      from: `"Yo merengues" <${process.env.EMAIL}>`,
      to: user.email,
      subject: 'Verification code',
      text,
      html: `<h1>Verification email</h1>
      <p>${text}</p>
    `
    });
    await user.save();
  }
  res.redirect('/user');
};