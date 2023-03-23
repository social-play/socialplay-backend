export interface IUser {
  userName: string;
  firstName: string;
  lastName: string;
  isOver16: boolean;
  captcha: boolean;
  email: string;
  password: string;
  accessGroups: [string];
}

export interface IGamePost {
  title: string;
  description: string;
  numberOfPages: number;
  language: string;
  imageUrl: string;
  buyUrl: string;
}
