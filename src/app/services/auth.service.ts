import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { UserModel } from '@app/models';
import { NotificationsService } from '@app/services/notifications.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private currentUser: Promise<UserModel>;
  private isInMess: Promise<boolean>;

  constructor(private http: HttpClient,
              private router: Router,
              private notificationsService: NotificationsService) {
    const authStatus = this.http.get<{user: UserModel, mess: boolean}>('/api/account/auth')
                           .pipe(catchError((err: any, caught) => of(null))).toPromise();
    this.currentUser = authStatus.then(auth => auth.user);
    this.isInMess = authStatus.then(auth => auth.mess === true);
  }

  checkMess = (): Promise<boolean> => this.isInMess;

  getUser = (): Promise<UserModel> => this.currentUser;

  check = (): Promise<boolean> => this.currentUser.then((user: UserModel) => user != null);

  isAdmin = (): Promise<boolean> => this.currentUser.then((user: UserModel) =>
                user.rollno === 'admin' || user.rollno === 'secy' || user.rollno === 'mess')

  logIn(roll: string, pass: string): Observable<number> {
    return this.http.post<UserModel>('/api/account/login', { rollno: roll, password: pass})
      .pipe(
        map((response: UserModel) => {
          this.currentUser = Promise.resolve(response);
          this.isInMess.then(mess => mess ? null : this.notificationsService.subscribeToNotifications());
          return 200;
        }),
        catchError(this.handleError)
      );
  }

  signUp(name: string, rollno: string, password: string): Observable<number> {
    return this.http.post<UserModel>('/api/account/signup', { name, rollno, password })
      .pipe(
        map((response: UserModel) => 200),
        catchError(this.handleError)
      );
  }

  verifyUser(id: string): Observable<number> {
    return this.http.post('/api/account/verify/' + id, {})
      .pipe(
        map(response => 200),
        catchError(this.handleError)
      );
  }

  forgotPassword(roll: string): Observable<number> {
    return this.http.post('/api/account/forgot_password', { rollno: roll })
      .pipe(
        map(response => 200),
        catchError(this.handleError)
      );
  }

  chngpin(oldpin: string, newpin: string): Observable<number> {
    return this.http.patch<UserModel>('/api/account/update', { password: oldpin, newpassword: newpin })
      .pipe(
        map((response: UserModel) => {
          this.currentUser = Promise.resolve(response);
          return 200;
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    this.currentUser = Promise.resolve(null);
    // To execute observable, it is converted to a promise
    this.http.post('/api/account/logout', {})
      .pipe(
        catchError(this.handleError)
      )
      .subscribe(_ => {
        this.isInMess.then(mess => {
          this.router.navigateByUrl(mess ? '/mess/login' : '/');
        });
      });
  }

  messIn(pass: string): Observable<number> {
    return this.http.post<{mess: boolean}>('/api/account/messin', {password: pass})
      .pipe(
        map((res: {mess: boolean}) => {
          this.isInMess = Promise.resolve(res.mess);
          return 200;
        }),
        catchError(this.handleError)
      );
  }

  messOut(pass: string): Promise<number> {
    const messingOut = this.http.post('/api/account/messout', { password: pass })
      .pipe(
        map((res) => 200),
        catchError(this.handleError)
      ).toPromise();

      this.isInMess = messingOut.then(res => res !== 200);
      this.currentUser = messingOut.then(async res => res === 200 ? null : await this.currentUser);
      return messingOut;
  }

  handleError(error: any): Observable<any> {
    if (error.status === 401) {
      this.currentUser = Promise.resolve(null);
    }
    if (error.status) {
      return of(error.status);
    }
    return throwError(error.message || error);
  }
}
