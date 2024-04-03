export interface IUser {
  _id: string;
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
  roomId: string;
  WeSearch: string;
  numberOfPages: number;
  language: string;
  imageUrl: string;
  buyUrl: string;
}
