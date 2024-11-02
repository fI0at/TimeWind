const geoip = require('geoip-lite');

const ipDetectionMiddleware = (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.socket.remoteAddress;
    const geo = geoip.lookup(ip);
    
    if (geo && geo.ll) {
        req.userLocation = {
            lat: geo.ll[0],
            lon: geo.ll[1]
        };
    }
    next();
};

module.exports = ipDetectionMiddleware;