import { Injectable } from '@angular/core';
import { JPTI } from 'src/lib/JPTI/JPTI';
import Service = JPTI.Service;
import LineSystem = JPTI.LineSystem;
import { BehaviorSubject } from 'rxjs';
import { RoutemapService } from '../routemap/routemap.service';
import { RouteService } from '../edit-route/route.service';
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
  /**
   * LineSystem追加中で、地図上でRoute選択待ち？
   */
  public canSelectRouteOnMap: BehaviorSubject<boolean> = new BehaviorSubject(
    false
  );
  /**
   * 相互に注入することを防ぐために、routemapは後から設定する。
   */
  private routemapService: RoutemapService;

  constructor(private routeService: RouteService) {}

  /**
   * routemap側から呼び出すこと
   */
  public setRouteMapService(routeMapService: RoutemapService) {
    this.routemapService = routeMapService;
  }

  /**
   * 地図上で路線が選択された時
   */
  public onSelectRoute(routeID: string) {
    if (!this.canSelectRouteOnMap.getValue()) return;
    this.addLineSystem(routeID);
  }

  /**
   * 編集中のサービスのObservable
   */
  public getCurrentServiceObservable() {
    return this.service.asObservable();
  }

  /**
   * 系統を新規作成する
   */
  public makeNewService() {
    const service = new Service();
    service.name = '新規系統';
    this.service.next(service);
    this.cacheService[service.id] = service;
    this.routemapService.changeService(service.id);
  }

  public deleteService() {}

  /**
   * 与えられたRouteの全区間をLineSystemとして追加する
   */
  public async addLineSystem(routeID: string) {
    const service = this.service.getValue();
    const lineSystem = new LineSystem();
    const route = await this.routeService.getRoute(routeID);
    const stations = route.routeStations;
    lineSystem.route = route;
    lineSystem.service = service;
    lineSystem.startStation = stations[0];
    lineSystem.endStation = stations[stations.length - 1];
    service.routes.push(lineSystem);
    this.service.next(service);
    this.routemapService.changeService(service.id);
  }

  /**
   * 指定されたindexのLineSystemを除去
   */
  public removeLineSystem(index: number) {
    const service = this.service.getValue();
    service.routes.splice(index, 1);
    this.routemapService.changeService(service.id);
  }
}
