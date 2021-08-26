import * as express from "express";
import * as session from "express-session";

module.exports.isSparkpostVerified = function (req: express.Request, res: express.Response, next: any) {
    if (!req.session.accountID) {
        console.log("AUTH_FAILURE: Request for " + req.url + " was not authenticated and was denied.")
        res.status(403).json({ error: 'This session has not been properly authenticated.'} );
    } else {
        return next();
    }
};