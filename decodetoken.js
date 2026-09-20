import jwt from 'jsonwebtoken';

const token = "";
const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
console.log(decoded);
