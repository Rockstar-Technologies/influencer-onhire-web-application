export type AccountType = "brand" | "creator";

export interface SignUpInput {
  accountType: AccountType;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface UserAccount {
  id: string;
  accountType: AccountType;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
}

export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailTakenError";
  }
}

export interface SignInInput {
  email: string;
  password: string;
  remember: boolean;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email or password is incorrect");
    this.name = "InvalidCredentialsError";
  }
}
