//"use strict";
//これ以外に読み込みが必要なもの
import {
  CircleMarker,
  LatLng,
  Polyline,
  LeafletEvent,
  Map,
  LatLngBounds,
  Marker,
  bounds,
} from 'leaflet';
import { f_lon_to_x, f_lat_to_y, f_x_to_lon, f_y_to_lat } from './lonlat_xy';
import { f_offset_segment_array } from './f_offset_segment_array';
import * as L from 'leaflet';
import {
  Point2,
  PolyLine,
  Segment,
  SegmentList,
  StationXY,
  SubSegment,
} from './a_hanyou';
import { JPTI } from '../../lib/JPTI/JPTI';
import JPTIroute = JPTI.Route;
import JPTIstation = JPTI.Station;
import { RoutemapService } from './routemap.service';
export namespace RouteMAP {
  export class MapBound {
    public latMin = 34;
    public latMax = 36;
    public lngMin = 134;
    public lngMax = 136;
    public getAPIparam(): string {
      return (
        'minLat=' +
        this.latMin +
        '&maxLat=' +
        this.latMax +
        '&minLon=' +
        this.lngMin +
        '&maxLon=' +
        this.lngMax
      );
    }
    public renewBounds(leafletBounds: LatLngBounds): boolean {
      if (
        this.latMin < leafletBounds.getSouth() &&
        this.latMax > leafletBounds.getNorth() &&
        this.lngMin < leafletBounds.getWest() &&
        this.lngMax > leafletBounds.getEast() &&
        this.latMax - this.latMin <=
          6 * (leafletBounds.getNorth() - leafletBounds.getSouth())
      ) {
        return false;
      }
      console.log('変更する');
      this.latMin = 2 * leafletBounds.getSouth() - leafletBounds.getNorth();
      this.latMax = 2 * leafletBounds.getNorth() - leafletBounds.getSouth();
      this.lngMin = 2 * leafletBounds.getWest() - leafletBounds.getEast();
      this.lngMax = 2 * leafletBounds.getEast() - leafletBounds.getWest();
      return true;
    }
  }
  export class Route {
    public jptiRoute: JPTIroute;
    public polylines: Polyline = null;
    public latlngs: LatLng[] = [];
    public segmentList: Segment[] = [];
    //駅の数だけある
    public l_points: CircleMarker[] = [];
    public points: Point2[] = [];
  }
  export class Station {
    public jptiStation: JPTIstation;
    get lat() {
      return this.jptiStation.lat;
    }
    get lon() {
      return this.jptiStation.lon;
    }
    public x: number;
    public y: number;
    public nameMarker: Marker;
  }
  export class RouteMapMain {
    public leafletMap: Map;
    private mapBound: MapBound = new MapBound();

    // オブジェクト表示レイヤー
    private stationNameLayer = L.featureGroup();
    private stationMarkLayer = L.featureGroup();
    private routeLayer = L.featureGroup();

    //内部データ
    // private routes:{[key:string]:Route}={};
    // private stations:{[key:string]:Station}={};
    //ズーム番号
    private zoomLevel = 10;

    constructor(
      private routemapService: RoutemapService,
      private routes: { [key: string]: Route },
      private stations: { [key: string]: Station }
    ) {}
    //ズームした時のオフセット量
    get offsetSize(): number {
      return 12 * 1.5 ** (20 - this.zoomLevel); //オフセット幅の調節
    }

    //busmap初期化
    //divID:leafletを表示するdivのID
    public async f_busmap(divID: string) {
      this.leafletMap = L.map(divID, {
        center: [35, 135],
        zoom: 12,
        doubleClickZoom: false,
      });
      L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution:
          '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
        opacity: 0.25,
      }).addTo(this.leafletMap); //背景地図（地理院地図等）を表示する。
      L.svg().addTo(this.leafletMap); //svg地図を入れる。
      // this.leafletMap.setView([36, 135], 10); //初期表示位置
      await this.routemapService.loadDataFromAPI(this.mapBound);
      this.init();
      //zoomlevelに応じてオフセット幅の倍率を自動で変える
      //ズームレベル変更→オフセット再計算→leaflet変更
      this.leafletMap.on('zoom', () => this.f_zoom());

      //スクロールが終わった時に表示領域変更
      this.leafletMap.on('moveend', e => this.move(e));
    }

    //MAP上のオブジェクトを消去する
    //RouteやStationに生成したオブジェクトを記録しているので、これを用いてMAPのオブジェクトを削除する
    public clearMap() {
      const time = performance.now();
      for (const routeID in this.routes) {
        try {
          this.routeLayer.removeLayer(this.routes[routeID].polylines);
          for (
            let stationIndex = 0;
            stationIndex < this.routes[routeID].points.length;
            stationIndex++
          ) {
            this.stationMarkLayer.removeLayer(
              this.routes[routeID].l_points[stationIndex]
            );
          }
        } catch (e) {
          console.log(e);
          console.log(this.routes[routeID]);
        }
      }
      for (const stationID in this.stations) {
        this.stationNameLayer.removeLayer(this.stations[stationID].nameMarker);
      }
      console.log('clearMap:' + (performance.now() - time));
    }
    //MAP上にオブジェクトを生成する。
    //この関数を何回も走らせると、どんどんオブジェクトが増えていき、Route,Stationに記録しているMAPのオブジェクトが上書きされるため、過去のMAPオブジェクトを消すことができなくなる。
    public init() {
      const startTime = performance.now();
      //色々調整
      this.f_offset_polyline();
      console.log('end f_offset_polyline:' + (performance.now() - startTime));

      //leafletで表示
      //線
      for (const routeID in this.routes) {
        this.routes[routeID].polylines = L.polyline(
          this.routes[routeID].latlngs,
          {
            color: this.routes[routeID].jptiRoute.color,
            weight: 5,
            opacity: 0.5,
          }
        )
          .addTo(this.routeLayer)
          .on('click', () => this.routeClicked(routeID));
        this.routes[routeID].l_points = [];
        for (
          let stationIndex = 0;
          stationIndex < this.routes[routeID].points.length;
          stationIndex++
        ) {
          this.routes[routeID].l_points.push(
            L.circleMarker(this.routes[routeID].points[stationIndex].latlon, {
              color: '#000000',
              fillColor: '#c0c0c0',
              fillOpacity: 1,
              radius: 2.5,
              weight: 0.5,
              opacity: 1,
            })
              .addTo(this.stationMarkLayer)
              .on('click', () => {
                this.stationClicked(
                  this.routes[routeID].jptiRoute.routeStations[stationIndex]
                    .stationID
                );
              })
          );
        }
      }
      //駅
      //駅名
      for (const stationID in this.stations) {
        this.stations[stationID].nameMarker = L.marker(
          [this.stations[stationID].lat, this.stations[stationID].lon],
          {
            icon: L.divIcon({
              html: this.stations[stationID].jptiStation.name,
              className: 'className',
              iconSize: [50, 16],
              iconAnchor: [-4, -4],
            }),
          }
        )
          .addTo(this.stationNameLayer)
          .on('click', () => this.stationClicked(stationID));
      }
      this.f_zoom();
      console.log('end zoom:' + (performance.now() - startTime));
    }
    //ズームした時の処理
    private f_zoom() {
      this.zoomLevel = this.leafletMap.getZoom();
      this.f_offset_polyline();
      //線
      for (const routeID in this.routes) {
        const route: Route = this.routes[routeID];
        route.polylines.setLatLngs(route.latlngs);
        //駅
        for (let i2 = 0; i2 < route.l_points.length; i2++) {
          route.l_points[i2].setLatLng(route.points[i2].latlon);
        }
      }
      if (this.zoomLevel < 9) {
        this.leafletMap.removeLayer(this.stationMarkLayer);
      } else {
        this.leafletMap.addLayer(this.stationMarkLayer);
      }
      this.leafletMap.addLayer(this.routeLayer);
      if (this.zoomLevel < 12) {
        this.leafletMap.removeLayer(this.stationNameLayer);
      } else {
        this.leafletMap.addLayer(this.stationNameLayer);
      }
    }

    private f_offset_polyline() {
      //a_zoom_ratioは今のところ無効

      for (const stationID in this.stations) {
        //緯度経度をxy（仮にEPSG:3857）に変換しておく
        this.stations[stationID].x = f_lon_to_x(
          this.stations[stationID].lon,
          null
        );
        this.stations[stationID].y = f_lat_to_y(
          this.stations[stationID].lat,
          null
        );
      }
      //折れ線の線分の列c_segment_arraysを作る
      //keyはrouteID
      for (const routeID in this.routes) {
        this.routes[routeID].segmentList = [];
        for (
          let stationIndex = 0;
          stationIndex <
          this.routes[routeID].jptiRoute.routeStations.length - 1;
          stationIndex++
        ) {
          const startStationID = this.routes[routeID].jptiRoute.routeStations[
            stationIndex
          ].stationID;
          const endStationID = this.routes[routeID].jptiRoute.routeStations[
            stationIndex + 1
          ].stationID;
          const segment = new Segment();
          segment.sid = startStationID;
          segment.eid = endStationID;
          segment.sx = this.stations[startStationID].x;
          segment.sy = this.stations[startStationID].y;
          segment.ex = this.stations[endStationID].x;
          segment.ey = this.stations[endStationID].y;
          segment.sn = true;
          segment.en = true;
          segment.w = null;
          segment.z = null;
          this.routes[routeID].segmentList.push(segment);
        }
      }

      //c_segment_arraysはRouteMap.segments;
      //線分をc_segmentsに集める
      //keyはsegmentのsidとeidの組み合わせ
      const c_segments: { [key: string]: SegmentList } = {};

      for (const routeID in this.routes) {
        for (
          let stationIndex = 0;
          stationIndex < this.routes[routeID].segmentList.length;
          stationIndex++
        ) {
          const c_segment = this.routes[routeID].segmentList[stationIndex];
          const c_segment_key_1 =
            'segment_' + c_segment.sid + '_' + c_segment.eid;
          const c_segment_key_2 =
            'segment_' + c_segment.eid + '_' + c_segment.sid;
          if (c_segments[c_segment_key_1] !== undefined) {
            const subSegment = new SubSegment();
            subSegment.id = routeID;
            subSegment.direction = 1;
            subSegment.w = 1;
            subSegment.z = null;
            c_segments[c_segment_key_1].segments[routeID] = subSegment;
            c_segments[c_segment_key_1].number += 1;
          } else if (c_segments[c_segment_key_2] !== undefined) {
            const subSegment = new SubSegment();
            subSegment.id = routeID;
            subSegment.direction = -1;
            subSegment.w = 1;
            subSegment.z = null;
            c_segments[c_segment_key_2].segments[routeID] = subSegment;
            c_segments[c_segment_key_2].number += 1;
          } else {
            const segmentList = new SegmentList();
            segmentList.number = 1;
            const subSegment = new SubSegment();
            subSegment.id = routeID;
            subSegment.direction = 1;
            subSegment.w = 1;
            subSegment.z = null;
            segmentList.segments[subSegment.id] = subSegment;
            c_segments[c_segment_key_1] = segmentList;
          }
        }
      }
      //オフセット幅zを設定
      for (const segSetKey in c_segments) {
        let l_z = -1 * (c_segments[segSetKey].number - 1) * 0.5;
        for (const i2 in c_segments[segSetKey].segments) {
          if (i2 !== 'number') {
            if (c_segments[segSetKey].segments[i2].direction === 1) {
              c_segments[segSetKey].segments[i2].z = l_z * this.offsetSize;
            } else if (c_segments[segSetKey].segments[i2].direction === -1) {
              c_segments[segSetKey].segments[i2].z = -1 * l_z * this.offsetSize;
            }
            l_z += 1;
          }
        }
      }

      //オフセット幅zをc_segment_arraysに入れる
      for (const routeID in this.routes) {
        for (
          let segmentIndex = 0;
          segmentIndex < this.routes[routeID].segmentList.length;
          segmentIndex++
        ) {
          const c_segment: Segment = this.routes[routeID].segmentList[
            segmentIndex
          ];
          const c_segment_key_1 =
            'segment_' + c_segment.sid + '_' + c_segment.eid;
          const c_segment_key_2 =
            'segment_' + c_segment.eid + '_' + c_segment.sid;
          if (c_segments[c_segment_key_1] !== undefined) {
            if (c_segments[c_segment_key_1].segments[routeID] !== undefined) {
              c_segment.z = c_segments[c_segment_key_1].segments[routeID].z;
            } else if (
              c_segments[c_segment_key_2].segments[routeID] !== undefined
            ) {
              c_segment.z = c_segments[c_segment_key_2].segments[routeID].z;
            }
          } else {
            c_segment.z = c_segments[c_segment_key_2].segments[routeID].z;
          }
        }
      }
      //オフセットした線を作る
      const c_polylines: { [key: string]: PolyLine[] } = {};
      for (const routeID in this.routes) {
        const segmentList = this.routes[routeID].segmentList;
        if (segmentList.length > 0) {
          f_offset_segment_array(this.routes[routeID]);
          //折れ線に変換する
          c_polylines[routeID] = [];
          for (let i2 = 0; i2 < segmentList[0].sxy.length; i2++) {
            const polyLine = new PolyLine();
            polyLine.x = segmentList[0].sxy[i2].x;
            polyLine.y = segmentList[0].sxy[i2].y;
            c_polylines[routeID].push(polyLine);
            if (segmentList[0].sxy.length === 3) {
              c_polylines[routeID][c_polylines[routeID].length - 2].ids = [
                segmentList[0].sid,
              ];
            } else {
              c_polylines[routeID][c_polylines[routeID].length - 1].ids = [
                segmentList[0].sid,
              ];
            }
          }
          for (let i2 = 0; i2 < segmentList.length; i2++) {
            for (let i3 = 0; i3 < segmentList[i2].exy.length; i3++) {
              const polyline = new PolyLine();
              polyline.x = segmentList[i2].exy[i3].x;
              polyline.y = segmentList[i2].exy[i3].y;
              c_polylines[routeID].push(polyline);
              if (segmentList[i2].exy.length === 3) {
                c_polylines[routeID][c_polylines[routeID].length - 2].ids = [
                  segmentList[i2].eid,
                ];
              } else {
                c_polylines[routeID][c_polylines[routeID].length - 1].ids = [
                  segmentList[i2].eid,
                ];
              }
            }
          }
          //xyを緯度経度に変換する
          for (let i2 = 0; i2 < c_polylines[routeID].length; i2++) {
            c_polylines[routeID][i2].lon = f_x_to_lon(
              c_polylines[routeID][i2].x,
              null
            );
            c_polylines[routeID][i2].lat = f_y_to_lat(
              c_polylines[routeID][i2].y,
              null
            );
          }

          //折れ線
          this.routes[routeID].latlngs = [];
          for (
            let stationIndex = 0;
            stationIndex < c_polylines[routeID].length;
            stationIndex++
          ) {
            const latlng = new LatLng(
              c_polylines[routeID][stationIndex].lat,
              c_polylines[routeID][stationIndex].lon
            );
            this.routes[routeID].latlngs.push(latlng);
          }
          //点
          this.routes[routeID].points = [];
          for (let i2 = 0; i2 < c_polylines[routeID].length; i2++) {
            if (c_polylines[routeID][i2].ids !== undefined) {
              if (c_polylines[routeID][i2].ids.length === 1) {
                //各点idは1つだけの前提（統合していないはず）
                const point = new Point2();
                point.id = c_polylines[routeID][i2].ids[0];
                point.latlon = new LatLng(
                  c_polylines[routeID][i2].lat,
                  c_polylines[routeID][i2].lon
                );
                this.routes[routeID].points.push(point);
              }
            }
          }
        }
      }
    }

    //マルチスレッドでAPI読み込みしてしまうとバグるので、読み込み処理中はmoveAbleをfalseにして、別イベントが発火しないようにする
    private moveAble = true;
    //	leafletがスクロールされたときに発火する
    private async move(e: LeafletEvent) {
      if (this.moveAble) {
        this.moveAble = false;
        if (this.mapBound.renewBounds(this.leafletMap.getBounds())) {
          this.clearMap();
          await this.routemapService.loadDataFromAPI(this.mapBound); //ここが遅い
          this.init();
        }
        this.moveAble = true;
      }
    }

    //コールバック関数達

    private stationClickedListener: (string) => void = null;
    private routeClickedListener: (string) => void = null;

    public setStationClickedListener(f: (string) => void) {
      this.stationClickedListener = f;
    }
    public clearStationClickedListener() {
      this.stationClickedListener = null;
    }
    public setRouteClickedListener(f: (string) => void) {
      this.routeClickedListener = f;
    }
    public clearRouteClickedListener() {
      this.routeClickedListener = null;
    }
    //駅がクリックされたときに呼び出される
    private stationClicked(stationID: string) {
      console.log(stationID);
      console.log(this.stations[stationID].jptiStation.name);
      if (this.stationClickedListener != null) {
        this.stationClickedListener(stationID);
      }
    }
    //路線がクリックされたときに呼び出される
    private routeClicked(routeID: string) {
      console.log(routeID);
      console.log(this.routes[routeID].jptiRoute.name);
      if (this.routeClickedListener != null) {
        this.routeClickedListener(routeID);
      }
    }
  }
}
