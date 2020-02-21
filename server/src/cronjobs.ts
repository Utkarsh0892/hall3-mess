import { Model } from 'mongoose';
import { UserModel } from './models/user.model';
import { Mailer } from './config/mailer.config';
import schedule from 'node-schedule';
import moment from 'moment';
import { TokenModel } from './models/token.model';

export class CronJobs {

    /**
     * Constructor
     *
     * @class AccountCtrl
     * @constructor
     */
    constructor(private userModel: Model<UserModel>,
                private mailer: Mailer) {
        moment.defaultFormat = 'YYYY-MM-DD HH:mm:ss';
    }

    public scheduleJobs() {
        schedule.scheduleJob('0 0 * * *', this.handleInactiveUsersJob);
    }

    private handleInactiveUsersJob = () => {

        console.log('Starting handleInactiveUsersJob...');

        this.userModel.find({ permissions: { $size: 0 } })
        .populate({
            path: 'tokens',
            options: { sort: '-date', limit: 1 },
            select: 'date'
        })
        .then((users: UserModel[]) => {

            const warningDays = 100;
            const maxDays = 5;
            const today = moment();
            const lastUseDate = (user: UserModel) => user.tokens.length > 0 ? (user.tokens[0] as TokenModel).date : user._id.getTimestamp();

            const inactiveUsers = users.filter(user => today.diff(lastUseDate(user), 'days') >= warningDays);
            const inactiveUsersToBeWarned = inactiveUsers.filter(user => !user.expiryMailSentOn);
            const inactiveUsersToBeDeleted = inactiveUsers.filter(user => user.expiryMailSentOn && today.diff(user.expiryMailSentOn, 'days') >= maxDays);

            console.log('Number of inactive users found: ' + inactiveUsers.length);
            console.log('Number of inactive users to be warned: ' + inactiveUsersToBeWarned.length);
            console.log('Number of inactive users to be deleted: ' + inactiveUsersToBeDeleted.length);

            inactiveUsersToBeWarned.forEach((inactiveUser) => {
                // Code to delete unverified user with >={warningDays} days of inactivity.
                if (!inactiveUser.verified) {
                    this.userModel.findOneAndRemove({rollno : inactiveUser.rollno})
                        .then(() => {
                            console.log('Deleted unverified user : ' + inactiveUser.rollno);
                        })
                        .catch((error) => console.error('Could not delete account for rollno: ' + inactiveUser.rollno, error));
                    return;
                }

                const dayDiff = today.diff(lastUseDate(inactiveUser), 'days');

                // Now send warning mail to those who are verified and set expiryMailSentOn to current date.
                console.log ('Sending deletion warning mail to rollno: ' + inactiveUser.rollno);
                this.mailer.sendInactivityWarningMail(inactiveUser, dayDiff, maxDays)
                    .then(() => {
                        this.userModel.findOneAndUpdate({rollno: inactiveUser.rollno}, { expiryMailSentOn: moment().format()})
                        .then((updatedUser: UserModel | null) => {
                            if (!updatedUser) {
                                throw new Error('User not found');
                            }
                            console.log(`Set expiryMailSentOn to today's date for ${updatedUser.rollno}`);
                        })
                        .catch((error) => console.error('Could not update expiryMailSentOn for rollno:' + inactiveUser.rollno, error));
                    })
                    .catch((error) => {
                        console.error('Some error occured while sending warning mail to ' + inactiveUser.rollno, error);
                    });
            });

            inactiveUsersToBeDeleted.forEach((inactiveUser) => {
                this.mailer.sendAccountDeletionMail(inactiveUser)
                    .then(() => {
                        this.userModel.findOneAndRemove({rollno : inactiveUser.rollno})
                        .then(() => {
                            console.log('Deleted inactive user : ' + inactiveUser.rollno);
                        })
                        .catch((error) => console.error('Error occured while deleting inactive account', error));
                    })
                    .catch((error) => {
                        console.error('Some error occured while sending deletion mail to ' + inactiveUser.rollno, error);
                    });
            });

        });

    }
}
