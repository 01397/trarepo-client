import { Component, OnInit } from '@angular/core';
import { JPTI } from 'src/lib/JPTI/JPTI';
import Service = JPTI.Service;
import { ServiceService } from './service.service';
import { StationService } from '../edit-station/station.service';

@Component({
  selector: 'app-edit-sevice',
  templateUrl: './edit-sevice.component.html',
  styleUrls: ['./edit-sevice.component.scss'],
})
export class EditSeviceComponent implements OnInit {
  /**
   * 編集対象の系統
   */
  public service: Service = null;
  /**
   * 「地図から選択」ボタンを表示？
   */
  public visibleSelectOnMap = false;
  /**
   * 駅IDから駅名への変換用
   */
  public stationNameList: { [key: string]: string } = {};

  constructor(
    private serviceService: ServiceService,
    private stationService: StationService
  ) {}

  ngOnInit() {
    this.serviceService.canSelectRouteOnMap.subscribe(value => {
      this.visibleSelectOnMap = value;
    });
    this.serviceService.getCurrentServiceObservable().subscribe(service => {
      this.service = service;
      console.log("hhh");
      this.updateStationList();
    });
    this.updateStationList();
  }

  /**
   * 系統を削除する
   */
  deleteService() {
    this.serviceService.deleteService();
  }

  /**
   * 系統を新規作成する
   */
  makeNewService() {
    this.serviceService.makeNewService();
  }

  /**
   * 地図上からのRoute選択を有効化
   */
  enableSelectingRouteOnMap() {
    this.serviceService.canSelectRouteOnMap.next(true);
  }

  /**
   * 地図上からのRoute選択を無効化
   */
  disableSelectingRouteOnMap() {
    this.serviceService.canSelectRouteOnMap.next(false);
  }

  /**
   * 路線を系統から解除する
   */
  removeLineSystem(index: number) {
    this.serviceService.removeLineSystem(index);
  }

  /**
   * stationNameList更新
   */
  async updateStationList() {
    if (this.service === null) return;
    for (const lineSystem of this.service.routes) {
      const stations = lineSystem.route.routeStations;
      const len = stations.length;
      for (let i = 0; i < len; i++) {
        const stationID = stations[i].stationID;
        if (stationID in this.stationNameList) continue;
        this.stationNameList[stationID] = (
          await this.stationService.getStation(stationID)
        ).name;
      }
    }
  }
}
