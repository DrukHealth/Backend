// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecretKey";

// export const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

//   if (!token) {
//     return res.status(401).json({
//       success: false,
//       message: "Access token required"
//     });
//   }

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({
//         success: false,
//         message: "Invalid or expired token"
//       });
//     }
    
//     req.user = user;
//     next();
//   });
// };

// export const requireAdmin = (req, res, next) => {
//   if (req.user && req.user.role === 'ADMIN') {
//     next();
//   } else {
//     return res.status(403).json({
//       success: false,
//       message: "Admin access required"
//     });
//   }
// };