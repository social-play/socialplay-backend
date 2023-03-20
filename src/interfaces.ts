export interface IUser {
  userName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  accessGroups: [string];
}
