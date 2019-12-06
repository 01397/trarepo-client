import { Injectable } from '@angular/core';
import { JPTI } from 'src/lib/JPTI/JPTI';
import Service = JPTI.Service;
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  /**
   * Serviceのキャッシュ。API呼び出し回数削減のため。
   */
  public cacheService: { [key: string]: Service } = {};
  /**
   * 編集対象のService
   */
  private service: BehaviorSubject<Service> = new BehaviorSubject(null);

  constructor() {}

  public makeNewService() {}

  public deleteService() {}

  public addRoute() {}

  public deleteRoute() {}
}
