export interface IUser {
  userName: string;
  firstName: string;
  lastName: string;
  isOver16: boolean;
  email: string;
  password: string;
  accessGroups: [string];
}
