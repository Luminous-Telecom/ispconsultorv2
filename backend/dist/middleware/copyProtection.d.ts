import { Request, Response, NextFunction } from 'express';
export declare const copyProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const devToolsDetectionMiddleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const fileProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const apiProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const imageProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const configProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=copyProtection.d.ts.map