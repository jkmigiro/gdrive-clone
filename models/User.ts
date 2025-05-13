import {ObjectId} from "mongoose"
export default interface User {
    _id: ObjectId;
    email: string;
    password: string;
}