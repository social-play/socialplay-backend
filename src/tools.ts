import crypto from "crypto";

export const getRandomConfirmationCode = () => {
  return crypto.randomBytes(10).toString("hex");
};

const passwordValidation = (userPassword: string) => {
  const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=?]).{8,}$/;

  return regex.test(userPassword);
};

const emailValidation = (userEmail: string) => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
};

export const validations = {
  status: "failed validation",
  errors: [
    {
      field: "userName",
      message: "username must be at least 2 characters long",
    },
    {
      field: "password",
      validator: passwordValidation,
      message:
        "Password must include at least one lowercase letter, one uppercase letter, one number, and one special character, and must be at least 8 characters long",
    },
    {
      field: "firstName",
      message: "First name must be at least 2 characters long",
    },
    {
      field: "lastName",
      message: "Last name must be at least 2 characters long",
    },
    {
      field: "email",
      validator: emailValidation,
      message: "Please enter a valid email , e.g. name@example.com",
    },
  ],
};
