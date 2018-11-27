import { Router } from 'express';
import { Model } from 'mongoose';
import { PassportStatic } from 'passport';

import { AccountCtrl } from '../controllers/accounts.controller';
import { UserModel } from '../models/user.model';

/**
 * For authentication purposes
 *
 * @class AccountsRoute
 */
export class AccountsRoute {

    /**
     * Create the router
     *
     * @class AccountsRoute
     * @method create
     * @return {Router} the router for this route
     * @static
     */
    public static create(userModel: Model<UserModel>, passport: PassportStatic): Router {

        const accountCtrl: AccountCtrl = new AccountCtrl(userModel);

        const router: Router = Router();

        router
            .get('/photo/:roll.jpg', accountCtrl.fetchPhoto)
            .get('/auth',  accountCtrl.checkAuth, (req, res) => res.json(accountCtrl.sanitize(req.user)))
            .post('/login',  passport.authenticate('mess-signin'), (req, res) => res.json(accountCtrl.sanitize(req.user)))
            .post('/signup', passport.authenticate('mess-signup'), accountCtrl.updateUser)
            .patch('/update', accountCtrl.checkAuth, accountCtrl.updateUser)
            .post('/logout', accountCtrl.checkAuth, accountCtrl.logout);

        return router;
    }

}
