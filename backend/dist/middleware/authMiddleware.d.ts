import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
interface AuthenticatedRequest extends Request {
    user?: jwt.JwtPayload | string;
}
export declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=authMiddleware.d.ts.map