import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

interface JwtPayload {
  userId: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please provide a valid token.' 
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'User not found. Token may be invalid.' 
      });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Please login again.' 
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};
