import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
        next();
    } catch { res.status(401).json({ error: 'Session expired or invalid' }); }
}

export function allowRoles(...allowedRoles) {
    return (req, res, next) => {
        if (allowedRoles.includes(req.user.role)) return next();
        return res.status(403).json({ error: 'This role cannot access the resource' });
    };
}