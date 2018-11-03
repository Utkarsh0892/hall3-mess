import { Component, OnInit } from '@angular/core';
import { TokensService } from '@app/services';
import { TokenModel } from '@app/models';
import * as moment from 'moment';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})

export class HistoryComponent implements OnInit {

  tokens = [];

  constructor(private tokensService: TokensService) {}

  ngOnInit() {
    this.tokensService.getTokens()
      .subscribe(tokens =>
        this.tokens = tokens.sort((t1, t2) =>
                        t2.date.localeCompare(t1.date)));
  }

  getCost(token: TokenModel) {
    let cost = 0;
    token.dishes
      .forEach(dish => cost += dish.price * dish.quantity);
    return cost;
  }

  // TODO : Display seperate accordians for each date.

  format(date: string) {
    return moment(date).format('Do\u00A0MMM\'YY, hh:mm\u00A0a');
  }
}
