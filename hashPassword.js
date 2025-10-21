import bcrypt from 'bcrypt';

const password = "Chimikawang2004"; // your password

const hashed = await bcrypt.hash(password, 10);
console.log("Hashed password:", hashed);
